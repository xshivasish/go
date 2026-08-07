import { clockHours, clockMinutes } from "../constants/misc";

type ExpiryTimePickerProps = {
  date: string;
  onDateChange: (value: string) => void;
  hour: string;
  onHourChange: (value: string) => void;
  minute: string;
  onMinuteChange: (value: string) => void;
  period: "AM" | "PM";
  onPeriodChange: (value: "AM" | "PM") => void;
  previewText: string;
};

/** The custom-expiry date field plus an analogue clock face for picking the time. */
export function ExpiryTimePicker({
  date,
  onDateChange,
  hour,
  onHourChange,
  minute,
  onMinuteChange,
  period,
  onPeriodChange,
  previewText,
}: ExpiryTimePickerProps) {
  return (
    <div className="creatorFieldGroup creatorFullField customExpiryPicker">
      <div className="customExpiryTop">
        <div>
          <label>Custom expiry</label>
          <p>Pick a date, then tap the clock to choose the time.</p>
        </div>
        <span>{previewText}</span>
      </div>

      <div className="customExpiryGrid">
        <div className="customDatePanel">
          <label>Date</label>
          <input type="date" value={date} onChange={(event) => onDateChange(event.target.value)} />

          <div className="periodToggle" aria-label="Select AM or PM">
            <button type="button" className={period === "AM" ? "active" : ""} onClick={() => onPeriodChange("AM")}>
              AM
            </button>
            <button type="button" className={period === "PM" ? "active" : ""} onClick={() => onPeriodChange("PM")}>
              PM
            </button>
          </div>

          <div className="manualTimeRow">
            <select value={hour} onChange={(event) => onHourChange(event.target.value)} aria-label="Custom expiry hour">
              {clockHours.map((h) => (
                <option value={h} key={h}>
                  {h.padStart(2, "0")}
                </option>
              ))}
            </select>
            <span>:</span>
            <select value={minute} onChange={(event) => onMinuteChange(event.target.value)} aria-label="Custom expiry minute">
              {clockMinutes.map((m) => (
                <option value={m} key={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="analogClockPanel" aria-label="Analogue time picker">
          <div className="analogClockFace">
            <span className="clockCenter" />
            <span
              className="clockHandHour"
              style={{
                transform: `translateX(-50%) rotate(${(Number(hour) % 12) * 30 + Number(minute) * 0.5}deg)`,
              }}
            />
            <span
              className="clockHandMinute"
              style={{ transform: `translateX(-50%) rotate(${Number(minute) * 6}deg)` }}
            />

            {clockHours.map((h, index) => {
              const angle = (index + 1) * 30;
              return (
                <button
                  type="button"
                  className={hour === h ? "active" : ""}
                  key={h}
                  style={{ transform: `rotate(${angle}deg) translateY(-82px) rotate(-${angle}deg)` }}
                  onClick={() => onHourChange(h)}
                >
                  {h}
                </button>
              );
            })}
          </div>

          <div className="minutePicker">
            {clockMinutes.map((m) => (
              <button type="button" className={minute === m ? "active" : ""} key={m} onClick={() => onMinuteChange(m)}>
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
