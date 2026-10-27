import { redirect } from 'next/navigation';

// The applicants list now lives in the recruiter dashboard's pipeline. This
// route stays so older links (including "new applicant" emails) keep working.
// `params` and `searchParams` are Promises on this Next.js version — see
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md.
export default async function ApplicantsRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ open?: string }>;
}) {
  const { id } = await params;
  const { open } = await searchParams;
  const q = new URLSearchParams({ view: 'applicants', job: id });
  if (open) q.set('open', open);
  redirect(`/recruiter/dashboard?${q.toString()}`);
}
