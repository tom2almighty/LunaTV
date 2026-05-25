import { useHistory } from '../hooks/useHistory';
import { HistorySection } from '../components/HistorySection';

export default function HistoryPage() {
  const historyQuery = useHistory();
  const records = historyQuery.data ?? {};

  return (
    <div className="app-page">
      <HistorySection records={records} />
    </div>
  );
}
