KOC E-commerce analytics pipeline

Usage:

```bash
python src/analyze.py --input "data/your_file.xlsx" --sheet "Báo cáo tùy chỉnh" --output "output/koc_report.xlsx" --topn 10
```

Output:
- An Excel file with sheets: CLEAN_DATA, TOP10_KOC_VIDEO, TOP10_KOC_LIVE, TOP10_SHOP, TOP10_PRODUCT, DASHBOARD_DATA, INSIGHTS

Notes:
- Script tự động detect các cột tiền tệ dạng Việt Nam (dấu chấm ngăn cách hàng nghìn, ký hiệu ₫).
- Nếu input file không tồn tại, script sẽ dừng và thông báo.
- Yêu cầu: `pandas`, `openpyxl`, `numpy`.

Frontend dashboard:
- `src/export_dashboard_json.py` exports processed Excel sheets into `frontend/public/data` as JSON.
- Run `python src/export_dashboard_json.py --input output/koc_report_processed.xlsx` before starting the React app.
- Then launch frontend from the `frontend` folder:
  ```bash
  cd frontend
  npm install
  npm run dev
  ```
