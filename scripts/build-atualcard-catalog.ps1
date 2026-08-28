param(
  [string]$InputDirectory = "data/supplier/atualcard",
  [string]$OutputPath = "data/supplier/atualcard-catalog.json"
)

$ErrorActionPreference = "Stop"
$markupMultiplier = 3
$collectionCategories = @("Entrega 12 Horas", "Lançamentos", "Pequenas Tiragens")

function ConvertTo-Slug {
  param([Parameter(Mandatory)][string]$Value)

  $normalized = $Value.Normalize([Text.NormalizationForm]::FormD)
  $withoutMarks = -join ($normalized.ToCharArray() | Where-Object {
    [Globalization.CharUnicodeInfo]::GetUnicodeCategory($_) -ne
      [Globalization.UnicodeCategory]::NonSpacingMark
  })
  $slug = $withoutMarks.ToLowerInvariant() -replace "[^a-z0-9]+", "-"
  return $slug.Trim("-")
}

function Get-ShortHash {
  param([Parameter(Mandatory)][string]$Value)

  $sha = [Security.Cryptography.SHA256]::Create()
  try {
    $bytes = [Text.Encoding]::UTF8.GetBytes($Value)
    return ([BitConverter]::ToString($sha.ComputeHash($bytes)) -replace "-", "").Substring(0, 8).ToLowerInvariant()
  } finally {
    $sha.Dispose()
  }
}

function Get-XlsRows {
  param([Parameter(Mandatory)][string]$Path)

  $resolvedPath = (Resolve-Path -LiteralPath $Path).Path
  $connection = [Data.OleDb.OleDbConnection]::new(
    "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$resolvedPath;Extended Properties='Excel 8.0;HDR=NO;IMEX=1'"
  )

  try {
    $connection.Open()
    $schema = $connection.GetOleDbSchemaTable([Data.OleDb.OleDbSchemaGuid]::Tables, $null)
    $sheetName = ($schema | Where-Object { $_.TABLE_NAME -like "*`$*" } | Select-Object -First 1).TABLE_NAME
    $command = $connection.CreateCommand()
    $command.CommandText = "SELECT * FROM [$sheetName]"
    $adapter = [Data.OleDb.OleDbDataAdapter]::new($command)
    $table = [Data.DataTable]::new()
    [void]$adapter.Fill($table)
    return ,$table
  } finally {
    $connection.Close()
    $connection.Dispose()
  }
}

function Get-CellText {
  param($Value)
  if ($null -eq $Value -or $Value -is [DBNull]) { return "" }
  return ([string]$Value).Trim()
}

function Get-ProductGroups {
  param(
    [Parameter(Mandatory)][string]$Path,
    [switch]$IncludeVariants
  )

  $table = Get-XlsRows -Path $Path
  $groups = [Collections.Generic.List[object]]::new()
  $current = $null

  foreach ($row in $table.Rows) {
    $c1 = Get-CellText $row[0]
    $c2 = Get-CellText $row[1]
    $c3 = Get-CellText $row[2]
    $c4 = Get-CellText $row[3]
    $c5 = Get-CellText $row[4]

    $isTitle = $c1 -and -not $c2 -and -not $c3 -and -not $c4 -and -not $c5
    if ($isTitle) {
      if ($c1 -notmatch "^Lista de Preços") {
        $current = [ordered]@{ name = $c1; variants = [Collections.Generic.List[object]]::new() }
        $groups.Add($current)
      }
      continue
    }

    if (-not $IncludeVariants -or $null -eq $current -or $c1 -eq "Lista de Preços") {
      continue
    }

    $quantity = 0
    if (-not [int]::TryParse($c3, [ref]$quantity)) { continue }

    $priceNumber = $c4 -replace "[^0-9,.-]", "" -replace "\.", "" -replace ",", "."
    $cost = 0.0
    if (-not [double]::TryParse(
      $priceNumber,
      [Globalization.NumberStyles]::Number,
      [Globalization.CultureInfo]::InvariantCulture,
      [ref]$cost
    )) { continue }

    $productionDays = 0
    [void][int]::TryParse($c2, [ref]$productionDays)
    $weight = 0.0
    [void][double]::TryParse(
      ($c5 -replace ",", "."),
      [Globalization.NumberStyles]::Number,
      [Globalization.CultureInfo]::InvariantCulture,
      [ref]$weight
    )

    $costCents = [int][Math]::Round($cost * 100, 0, [MidpointRounding]::AwayFromZero)
    $current.variants.Add([ordered]@{
      specification = $c1
      quantity = $quantity
      supplier_cost_cents = $costCents
      price_cents = $costCents * $markupMultiplier
      production_days = $productionDays
      weight_kg = $weight
    })
  }

  return $groups
}

$inputRoot = (Resolve-Path -LiteralPath $InputDirectory).Path
$manifest = Get-Content -Raw -LiteralPath (Join-Path $inputRoot "manifest.json") | ConvertFrom-Json
$masterFile = Join-Path $inputRoot "precos_lista.xls"
$masterProducts = Get-ProductGroups -Path $masterFile -IncludeVariants
$categoriesByProduct = @{}

foreach ($file in $manifest.files) {
  if ($file.name -eq "Todos os produtos") { continue }

  $categoryFile = Join-Path $inputRoot $file.fileName
  if (-not (Test-Path -LiteralPath $categoryFile)) { continue }

  foreach ($group in (Get-ProductGroups -Path $categoryFile)) {
    if (-not $categoriesByProduct.ContainsKey($group.name)) {
      $categoriesByProduct[$group.name] = [Collections.Generic.List[string]]::new()
    }
    if (-not $categoriesByProduct[$group.name].Contains($file.name)) {
      $categoriesByProduct[$group.name].Add($file.name)
    }
  }
}

$catalogProducts = [Collections.Generic.List[object]]::new()

foreach ($product in $masterProducts) {
  $mappedCategories = @($categoriesByProduct[$product.name] | Where-Object { $_ })
  $preferredCategories = @($mappedCategories | Where-Object { $_ -notin $collectionCategories })
  $categoryName = if ($preferredCategories.Count) {
    $preferredCategories[0]
  } elseif ($mappedCategories.Count) {
    $mappedCategories[0]
  } else {
    "Outros Produtos"
  }

  $baseSlug = ConvertTo-Slug $product.name
  if ($baseSlug.Length -gt 80) { $baseSlug = $baseSlug.Substring(0, 80).Trim("-") }
  $productSlug = "$baseSlug-$(Get-ShortHash "$categoryName|$($product.name)")"

  $eligibleVariants = [Collections.Generic.List[object]]::new()
  foreach ($configuration in ($product.variants | Group-Object specification)) {
    $hasCommercialLot = @($configuration.Group | Where-Object { $_.quantity -ge 10 }).Count -gt 0
    foreach ($variant in $configuration.Group) {
      if (-not $hasCommercialLot -or $variant.quantity -ge 10) {
        $eligibleVariants.Add($variant)
      }
    }
  }

  if (-not $eligibleVariants.Count) { continue }

  $catalogProducts.Add([ordered]@{
    supplier = "Atual Card"
    supplier_key = Get-ShortHash "$($product.name)|$categoryName"
    category_name = $categoryName
    category_slug = ConvertTo-Slug $categoryName
    slug = $productSlug
    name = $product.name
    description = "Produto personalizado sob demanda. Consulte as opções de material, acabamento, formato e quantidade."
    variants = @($eligibleVariants | Sort-Object specification, quantity | ForEach-Object {
      [ordered]@{
        label = "$($_.specification) — $($_.quantity) un."
        quantity = $_.quantity
        price_cents = $_.price_cents
        attributes = [ordered]@{
          supplier = "Atual Card"
          supplier_cost_cents = $_.supplier_cost_cents
          markup_percent = 200
          specification = $_.specification
          production_days = $_.production_days
          weight_kg = $_.weight_kg
        }
      }
    })
  })
}

$catalog = [ordered]@{
  source = $manifest.source
  price_date = (Get-Item -LiteralPath $masterFile).LastWriteTime.ToString("yyyy-MM-dd")
  generated_at = (Get-Date).ToUniversalTime().ToString("o")
  markup_percent = 200
  price_multiplier = $markupMultiplier
  minimum_rule = "Quando a configuração oferece lote de 10 ou mais unidades, opções abaixo de 10 não são publicadas."
  products = $catalogProducts
}

$resolvedOutput = [IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputPath))
$outputDirectory = [IO.Path]::GetDirectoryName($resolvedOutput)
[IO.Directory]::CreateDirectory($outputDirectory) | Out-Null
$catalog | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $resolvedOutput -Encoding utf8

$variantCount = ($catalogProducts | ForEach-Object { $_.variants.Count } | Measure-Object -Sum).Sum
$categoryCount = ($catalogProducts.category_slug | Sort-Object -Unique).Count
Write-Output "Categorias: $categoryCount"
Write-Output "Produtos: $($catalogProducts.Count)"
Write-Output "Variantes publicáveis: $variantCount"
Write-Output "Catálogo: $resolvedOutput"
