#!/bin/bash

# Find all files with any of the patterns and replace
rg -l "\{\{ ref\('(sat_|view_las_|lks_)\w+_curr'\) \}\}" models/infomart/ --glob '!models/generated/**' | while read -r file; do
    echo "Processing: $file"
    # Replace sat_*_curr with sat_*_bvv_curr
    sed -i '' -E "s/\{\{ ref\('(sat_[^']+)_curr'\) \}\}/{{ ref('\1_bvv_curr') }}/g" "$file"
    # Replace view_las_*_curr with view_las_*_bvv_curr
    sed -i '' -E "s/\{\{ ref\('(view_las_[^']+)_curr'\) \}\}/{{ ref('\1_bvv_curr') }}/g" "$file"
    # Replace lks_*_curr with lks_*_bvv_curr
    sed -i '' -E "s/\{\{ ref\('(lks_[^']+)_curr'\) \}\}/{{ ref('\1_bvv_curr') }}/g" "$file"
done

echo "Replacement complete!"