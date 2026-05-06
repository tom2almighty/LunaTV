export interface SearchResult {
  id: string;
  title: string;
  poster: string;
  source: string;
  source_name: string;
  year: string;
  episodes: string[];
  episodes_titles: string[];
  class: string;
  desc: string;
  type_name: string;
  douban_id: number;
  score: string;
  actors: string;
  directors: string;
  area: string;
  lang: string;
  remark: string;
}

export interface RecommendationItem {
  id: string;
  title: string;
  poster: string;
  year: string;
  rating: string;
  externalUrl?: string;
}

export interface RecommendationHomeResult {
  movies: RecommendationItem[];
  tvShows: RecommendationItem[];
  varietyShows: RecommendationItem[];
}

export interface PlayRecord {
  title: string;
  source_name: string;
  year?: string;
  cover: string;
  total_episodes: number;
  index: number;
  play_time: number;
  total_time: number;
  save_time: number;
  search_title?: string;
}
