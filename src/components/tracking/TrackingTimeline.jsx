const statusIcons = {
  picked_up:   '📦',
  in_transit:  '🚚',
  out_for_delivery: '🛵',
  delivered:   '✅',
  failed:      '❌',
};

export default function TrackingTimeline({ events }) {
  if (!events?.length) return <p>No tracking updates yet.</p>;

  return (
    <ul className="tracking-timeline">
      {events.map((event, i) => (
        <li key={i} className={`timeline-item ${i === 0 ? 'latest' : ''}`}>
          <span className="timeline-icon">
            {statusIcons[event.status] ?? '📍'}
          </span>
          <div className="timeline-content">
            <p className="timeline-message">{event.message}</p>
            <span className="timeline-date">{event.datetime}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

const statusIcons = {
  picked_up:   '📦',
  in_transit:  '🚚',
  out_for_delivery: '🛵',
  delivered:   '✅',
  failed:      '❌',
};

export default function TrackingTimeline({ events }) {
  if (!events?.length) return <p>No tracking updates yet.</p>;

  return (
    <ul className="tracking-timeline">
      {events.map((event, i) => (
        <li key={i} className={`timeline-item ${i === 0 ? 'latest' : ''}`}>
          <span className="timeline-icon">
            {statusIcons[event.status] ?? '📍'}
          </span>
          <div className="timeline-content">
            <p className="timeline-message">{event.message}</p>
            <span className="timeline-date">{event.datetime}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}