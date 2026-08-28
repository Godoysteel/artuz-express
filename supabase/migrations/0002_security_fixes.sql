-- Corrige achados do advisor de segurança: views com security_invoker,
-- search_path fixo em funções, e execução pública de trigger function.

alter view public.product_starting_prices set (security_invoker = on);
alter view public.category_starting_prices set (security_invoker = on);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;
