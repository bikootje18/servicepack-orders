-- Tarief met veel meer decimalen bewaren (voorheen numeric(10,4) -> afgerond op 4).
-- Nu tot 20 cijfers achter de komma, zodat tarieven niet afronden.
alter table facturatie_codes alter column tarief type numeric(30,20);
alter table facturen alter column tarief type numeric(30,20);
