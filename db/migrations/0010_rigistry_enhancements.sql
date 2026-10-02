-- Rigistry Enhancements Migration
-- 1. Ensure Soldano brand categories include amplifiers-effects
update brands
set categories = array['amplifiers-effects']
where normalized_name in ('soldano', 'soldano custom amplification') and (categories is null or categories = '{}');

-- 2. Ensure canonical brand aliases exist
insert into brand_aliases (brand_id, alias)
select b.id, 'soldano'
from brands b
where b.normalized_name = 'soldano custom amplification' or b.normalized_name = 'soldano'
order by b.id desc
limit 1
on conflict (alias) do nothing;

insert into brand_aliases (brand_id, alias)
select b.id, 'charvel'
from brands b
where b.normalized_name = 'charvel'
limit 1
on conflict (alias) do nothing;

insert into brand_aliases (brand_id, alias)
select b.id, 'tubescreamer'
from brands b
where b.normalized_name = 'ibanez'
limit 1
on conflict (alias) do nothing;
