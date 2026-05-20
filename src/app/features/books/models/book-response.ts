export interface BookResponse {
  id: string;
  title: string;
  description: string;
  coverPath: string | null;
  published: boolean;
  publishedDate: string | null;
  updatedAt: string;
  chapter: any[];
}