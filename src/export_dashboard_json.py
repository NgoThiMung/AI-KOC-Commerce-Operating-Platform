from __future__ import annotations
import argparse
import json
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

EXPECTED_SHEETS = [
    "DASHBOARD_DATA",
    "TOP10_KOC_GMV",
    "TOP10_KOC_VIDEO",
    "TOP10_KOC_LIVE",
    "TOP10_SHOP",
    "TOP10_PRODUCT",
    "KOC_SEGMENTATION",
    "VIDEO_LIVE_COMPARISON",
    "INSIGHTS",
]


def parse_value(value: Any) -> Any:
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating,)):
        return float(value)
    if isinstance(value, (np.bool_,)):
        return bool(value)
    if pd.isna(value):
        return None
    return value


def dataframe_to_json_records(df: pd.DataFrame) -> list[dict[str, Any]]:
    records = []
    for row in df.to_dict(orient="records"):
        record = {k: parse_value(v) for k, v in row.items()}
        records.append(record)
    return records


def export_sheet(excel_path: Path, sheet_name: str, output_path: Path) -> None:
    df = pd.read_excel(excel_path, sheet_name=sheet_name)
    records = dataframe_to_json_records(df)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as handle:
        json.dump(records, handle, ensure_ascii=False, indent=2)


def export_all(input_path: Path, output_dir: Path) -> None:
    if not input_path.exists():
        raise FileNotFoundError(f"Không tìm thấy file Excel: {input_path}")

    print(f"Loading workbook: {input_path}")
    for sheet_name in EXPECTED_SHEETS:
        output_file = output_dir / f"{sheet_name.lower()}.json"
        if sheet_name not in pd.ExcelFile(input_path).sheet_names:
            print(f"Warning: missing sheet {sheet_name}, skipping export.")
            continue
        export_sheet(input_path, sheet_name, output_file)
        print(f"Exported {sheet_name} → {output_file}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Export dashboard JSON from processed KOC report Excel.")
    parser.add_argument(
        "--input",
        type=Path,
        default=Path("output/koc_report_processed.xlsx"),
        help="Path to the processed Excel report.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("frontend/public/data"),
        help="Directory where JSON files will be written.",
    )
    args = parser.parse_args()

    export_all(args.input, args.output)
    print("Export complete.")


if __name__ == "__main__":
    main()
