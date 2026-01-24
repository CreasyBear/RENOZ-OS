# Metric Catalog

Canonical metrics sourced from analytics materialized views.

## mv_daily_metrics
- **orders_count**: Count of orders per day.
- **orders_total**: Sum of order totals per day.
- **tax_total**: Sum of order tax per day.
- **opportunities_count**: Opportunities created per day.
- **opportunities_value**: Sum of opportunity value per day.
- **opportunities_weighted**: Sum of weighted pipeline value per day.
- **issues_count**: Support issues created per day.
- **customers_count**: Customers created per day.

## mv_daily_pipeline
- **opportunities_count**: Opportunities created per stage per day.
- **total_value**: Sum of value per stage per day.
- **weighted_value**: Sum of weighted value per stage per day.

## mv_daily_jobs
- **total_jobs**: Job assignments scheduled per day.
- **completed_jobs**: Job assignments completed per day.
- **cancelled_jobs**: Job assignments cancelled per day.
- **in_progress_jobs**: Job assignments in progress per day.
- **on_hold_jobs**: Job assignments on hold per day.

## mv_daily_warranty
- **total_claims**: Warranty claims submitted per day.
- **submitted_claims**: Submitted claims per day.
- **under_review_claims**: Claims under review per day.
- **approved_claims**: Approved claims per day.
- **denied_claims**: Denied claims per day.
- **resolved_claims**: Resolved claims per day.

## mv_current_state
- **open_orders**: Orders not delivered or cancelled.
- **open_opportunities**: Opportunities not won or lost.
- **open_jobs**: Jobs scheduled, in progress, or on hold.
- **open_issues**: Issues open, in progress, or on hold.
- **open_warranty_claims**: Claims submitted, under review, or approved.
