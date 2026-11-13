import { redirect } from 'next/navigation';

export default async function PracticeRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ testId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { testId } = await params;
  const sp = await searchParams;
  const queryString = new URLSearchParams(sp as Record<string, string>).toString();
  redirect(`/exam/${testId}/practice${queryString ? `?${queryString}` : ''}`);
}
