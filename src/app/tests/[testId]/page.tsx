import { redirect } from 'next/navigation';

export default async function TestRedirectPage({
  params,
}: {
  params: Promise<{ testId: string }>;
}) {
  const { testId } = await params;
  redirect(`/exam/${testId}`);
}
