alter table vrachten
  add column status text not null default 'aangemaakt'
  check (status in ('aangemaakt', 'opgehaald'));
