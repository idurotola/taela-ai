import ResetPasswordForm from './ResetPasswordForm';

// `searchParams` is a Promise on this Next.js version — see
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md.
// Reading the token here (instead of `useSearchParams` in the client form)
// avoids needing a Suspense boundary for a static build.
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <ResetPasswordForm token={token} />;
}
