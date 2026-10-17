import type { DayBoardModel } from "@/lib/day-board";

type Props = {
  board: DayBoardModel;
  /** Highlight cells matching this teacher fragment. */
  highlightTeacher?: string;
};

export function DayBoard({ board, highlightTeacher = "" }: Props) {
  const q = highlightTeacher.trim();
  const classCount = board.classes.length;

  return (
    <div
      className="day-board day-board-wide"
      style={{ ["--classes" as string]: String(classCount) }}
    >
      <table>
        <colgroup>
          <col className="period-col" />
          {board.classes.map((c) => (
            <col key={c} className="class-col" />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th className="period">節次</th>
            {board.classes.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {board.rows.map((row) => {
            const mineRow =
              q &&
              (row.duties.some((d) => d.teacher.includes(q)) ||
                Object.values(row.cells).some((c) => c.teacher.includes(q)));
            return (
              <tr
                key={row.period.id}
                className={row.duty ? "duty-row" : undefined}
                data-period={row.period.id}
              >
                <th className="period">
                  <div className="period-label">{row.period.label}</div>
                  {row.period.time ? (
                    <div className="time">{row.period.time}</div>
                  ) : null}
                </th>
                {row.schoolDuty ? (
                  <td colSpan={classCount} className="school-duty-cell">
                    <div className="school-duty">
                      {row.duties.length === 0 ? (
                        <span className="empty-duty">—</span>
                      ) : (
                        row.duties.map((d, i) => (
                          <span
                            key={`${d.post}-${d.teacher}-${i}`}
                            className={`duty-chip${
                              q && d.teacher.includes(q) ? " mine" : ""
                            }`}
                          >
                            <span className="post">{d.post}</span>
                            <span className="who">{d.teacher}</span>
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                ) : (
                  board.classes.map((className) => {
                    const cell = row.cells[className];
                    const mine =
                      Boolean(q) &&
                      Boolean(cell?.teacher) &&
                      cell.teacher.includes(q);
                    const empty = !cell || cell.empty;
                    return (
                      <td
                        key={className}
                        className={mine || (mineRow && mine) ? "mine" : undefined}
                      >
                        {empty ? (
                          <div className="cell-lesson empty" />
                        ) : (
                          <div
                            className={`cell-lesson${cell.changed ? " changed" : ""}`}
                          >
                            <div className="course">{cell.subject || cell.course}</div>
                            <div className="teacher">
                              {cell.teacher}
                              {cell.changed && cell.baseTeacher ? (
                                <span className="was"> {cell.baseTeacher}</span>
                              ) : null}
                            </div>
                          </div>
                        )}
                      </td>
                    );
                  })
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
