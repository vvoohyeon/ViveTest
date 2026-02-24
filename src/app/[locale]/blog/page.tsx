import {BlogPage} from '@/features/landing/blog-page';

type BlogPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LocaleBlogPage({searchParams}: BlogPageProps) {
  const params = await searchParams;
  const source = typeof params.source === 'string' ? params.source : undefined;

  return <BlogPage source={source} />;
}
