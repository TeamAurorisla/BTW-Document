"""Import the current materials manuscript into the SQLite source database.

This is a one-time migration helper. Daily edits happen in the SQLite file.
"""

from __future__ import annotations

import argparse
import re
import sqlite3
import unicodedata
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
SCHEMA = """
CREATE TABLE IF NOT EXISTS arcane_materials (
  id TEXT NOT NULL PRIMARY KEY CHECK (length(trim(id)) > 0),
  name TEXT NOT NULL UNIQUE CHECK (length(trim(name)) > 0),
  origin TEXT NOT NULL CHECK (origin IN ('原版', '新增')),
  category TEXT NOT NULL CHECK (category IN ('原材料', '战利品', '加工品', '源质')),
  description TEXT NOT NULL,
  uses TEXT NOT NULL,
  stage TEXT NOT NULL,
  school TEXT NOT NULL,
  acquisition TEXT NOT NULL,
  notes TEXT,
  family TEXT
) STRICT;
"""


def cell_value(cell: ET.Element, shared_strings: list[str]) -> str:
    value = cell.find("m:v", NS)
    inline = cell.find("m:is", NS)
    if cell.attrib.get("t") == "s" and value is not None:
        return shared_strings[int(value.text or "0")]
    if inline is not None:
        return "".join(inline.itertext())
    return value.text if value is not None and value.text is not None else ""


def read_rows(path: Path) -> list[dict[str, str]]:
    with zipfile.ZipFile(path) as workbook:
        shared_strings = []
        if "xl/sharedStrings.xml" in workbook.namelist():
            root = ET.fromstring(workbook.read("xl/sharedStrings.xml"))
            shared_strings = ["".join(item.itertext()) for item in root.findall("m:si", NS)]
        sheet = ET.fromstring(workbook.read("xl/worksheets/sheet1.xml"))
        rows: list[dict[str, str]] = []
        for row in sheet.findall("m:sheetData/m:row", NS):
            values: dict[str, str] = {}
            for cell in row:
                ref = cell.attrib.get("r", "")
                column = "".join(char for char in ref if char.isalpha())
                value = cell_value(cell, shared_strings).strip()
                if value:
                    values[column] = value
            if values.get("A") and values.get("A") != "名称":
                rows.append(values)
        return rows


def make_id(name: str, used: set[str]) -> str:
    value = unicodedata.normalize("NFKC", name).strip().lower()
    value = re.sub(r"\s+", "-", value)
    value = value.replace("/", "-")
    value = re.sub(r"[^\w\-\u3400-\u9fff]", "-", value, flags=re.UNICODE)
    value = re.sub(r"-+", "-", value).strip("-") or "material"
    candidate = value
    suffix = 2
    while candidate in used:
        candidate = f"{value}-{suffix}"
        suffix += 1
    used.add(candidate)
    return candidate


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", default="library/奥法新生-材料设计手稿.xlsx")
    parser.add_argument("--database", default="data/arcane_materials.sqlite")
    args = parser.parse_args()
    source = Path(args.source)
    database = Path(args.database)
    if database.exists():
        parser.error(f"数据库已存在，不覆盖日常维护数据：{database}")
    database.parent.mkdir(parents=True, exist_ok=True)

    rows = read_rows(source)
    connection = sqlite3.connect(database)
    connection.execute("PRAGMA foreign_keys = ON")
    connection.executescript(SCHEMA)
    used: set[str] = set()
    for row in rows:
        connection.execute(
            """
            INSERT INTO arcane_materials
              (id, name, origin, category, description, uses, stage, school,
               acquisition, notes, family)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                make_id(row["A"], used),
                row["A"],
                row["B"],
                row["C"],
                row["D"],
                row["E"],
                row["F"],
                row["G"],
                row["H"],
                row.get("I"),
                row.get("J"),
            ),
        )
    connection.commit()
    connection.close()
    print(f"Imported {len(rows)} materials into {database}")


if __name__ == "__main__":
    main()
