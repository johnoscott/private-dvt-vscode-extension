
.PHONY: d2
d2:
	echo "running models: infomart/02_fact_client_visits"
	dbt run --select 'dbt_infomart.infomart.02_fact_client_visits.*' --full-refresh

.PHONY: d3
d3:
	echo "running models: infomart/03_dim_hr_rep"
	dbt run --select 'dbt_infomart.infomart.03_dim_hr_rep.*' --full-refresh


.PHONY: d6
d6:
	echo "running models: infomart/06_fact_client_visits"
	dbt run --select 'dbt_infomart.infomart.06_fact_client_visits.*' --full-refresh --fail-fast