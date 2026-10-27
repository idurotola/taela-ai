import ApplicantsView from './ApplicantsView';

// `params` is a Promise on this Next.js version — see
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md.
export default async function ApplicantsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ApplicantsView jobId={id} />;
}
