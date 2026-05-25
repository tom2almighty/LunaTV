import { useSearchParams } from 'react-router-dom';
import { Clock, Home as HomeIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRecommendations } from '../hooks/useRecommendations';
import { useHistory } from '../hooks/useHistory';
import { RecommendationSection } from '../components/RecommendationSection';
import { HistorySection } from '../components/HistorySection';

type TabValue = 'home' | 'history';

export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: TabValue = searchParams.get('tab') === 'history' ? 'history' : 'home';

  const handleTabChange = (next: string) => {
    if (next === 'history') setSearchParams({ tab: 'history' }, { replace: true });
    else setSearchParams({}, { replace: true });
  };

  const recQuery = useRecommendations();
  const historyQuery = useHistory();

  const movies = recQuery.data?.movies ?? [];
  const tvShows = recQuery.data?.tvShows ?? [];
  const varietyShows = recQuery.data?.varietyShows ?? [];
  const recLoading = recQuery.isLoading;
  const historyRecords = historyQuery.data ?? {};

  return (
    <div className="app-page">
      <Tabs value={tab} onValueChange={handleTabChange} className="space-y-8">
        <TabsList>
          <TabsTrigger value="home" className="gap-1.5">
            <HomeIcon className="h-3.5 w-3.5" strokeWidth={2} />
            推荐
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" strokeWidth={2} />
            历史记录
          </TabsTrigger>
        </TabsList>

        <TabsContent value="home" className="space-y-10">
          <RecommendationSection
            label="热门电影"
            items={movies}
            doubanType="movie"
            loading={recLoading && movies.length === 0}
          />
          <RecommendationSection
            label="热门剧集"
            items={tvShows}
            doubanType="tv"
            loading={recLoading && tvShows.length === 0}
          />
          <RecommendationSection
            label="热门综艺"
            items={varietyShows}
            doubanType="show"
            loading={recLoading && varietyShows.length === 0}
          />
        </TabsContent>

        <TabsContent value="history">
          <HistorySection records={historyRecords} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
