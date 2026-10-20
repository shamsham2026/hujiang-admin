"use client";

import { cellsForDay, CLASS_CODES, GRID_ROWS, type CellView } from "@/lib/activity-week-grid";
import type { ActivityEntry, ActivityPlacement } from "@/lib/activity-week-types";

export function ActivityWeekGrid({
  date,
  entries,
  placements,
  armedId,
  onPlace,
  onUnplace,
}: {
  date: string;
  entries: ActivityEntry[];
  placements: ActivityPlacement[];
  armedId: string | null;
  onPlace: (entryId: string, classCode: string, period: string) => void;
  onUnplace: (placementId: string) => void;
}) {
  const cells = cellsForDay(date, entries, placements);

  return (
    <div
      className="day-board aw-board"
      style={{ ["--classes" as string]: String(CLASS_CODES.length), ["--class-col" as string]: "4.6rem" }}
    >
      <table>
        <colgroup>
          <col className="period-col" />
          {CLASS_CODES.map((code) => (
            <col key={code} className="class-col" />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th className="period">節</th>
            {CLASS_CODES.map((code) => (
              <th key={code}>{code}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {GRID_ROWS.map((row) =>
            row.kind === "break" ? (
              <tr key={`${row.name}-${row.time}`} className="duty-row">
                <th className="period">
                  <div className="period-label">{row.name}</div>
                  <div className="time">{row.time}</div>
                </th>
                <td colSpan={CLASS_CODES.length} className="aw-break">
                  {row.name}
                </td>
              </tr>
            ) : (
              <tr key={row.name}>
                <th className="period">
                  <div className="period-label">{row.name}</div>
                  <div className="time">
                    {row.time}
                    {row.note ? `（${row.note}）` : ""}
                  </div>
                </th>
                {CLASS_CODES.map((classCode) => {
                  const items = cells.get(`${classCode}|${row.name}`) ?? [];
                  const conflict = items.some((item) => item.conflict);
                  return (
                    <td
                      key={classCode}
                      className={`aw-cell${conflict ? " aw-conflict" : ""}${armedId ? " aw-armed" : ""}`}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        const entryId = event.dataTransfer.getData("text/aw-entry");
                        if (entryId) onPlace(entryId, classCode, row.name);
                      }}
                      onClick={() => {
                        if (armedId) onPlace(armedId, classCode, row.name);
                      }}
                    >
                      {items.map((item) => (
                        <Chip key={item.placementId} item={item} onUnplace={onUnplace} />
                      ))}
                    </td>
                  );
                })}
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}

function Chip({
  item,
  onUnplace,
}: {
  item: CellView;
  onUnplace: (placementId: string) => void;
}) {
  return (
    <button
      type="button"
      className={`aw-chip${item.conflict ? " conflict" : ""}`}
      title={`${item.title} ${item.venueCode} · 撳一下移走`}
      onClick={(event) => {
        event.stopPropagation();
        onUnplace(item.placementId);
      }}
    >
      <span className="course">{item.title}</span>
      <span className="teacher">{item.venueCode}</span>
    </button>
  );
}
