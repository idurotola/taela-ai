import Link from 'next/link';

export default function JobNotFound() {
  return (
    <div style={{ fontFamily: 'Nunito, sans-serif', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F5EFE8', padding: 24, textAlign: 'center' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>This job isn&rsquo;t available</h1>
      <p style={{ color: '#6B6B6B', fontSize: 14, marginBottom: 20 }}>The link may be wrong, or the posting was removed.</p>
      <Link href="/" style={{ color: '#2878B5', fontWeight: 700 }}>Go to TaelaAI</Link>
    </div>
  );
}
