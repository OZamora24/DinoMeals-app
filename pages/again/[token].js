// dinomeals.app/again/<code> (from the Thursday text) -> the order page with that order ready (lib/again.js).
export async function getServerSideProps({ params }) {
  const token = encodeURIComponent(String(params.token || '').slice(0, 80));
  return { redirect: { destination: `/order?again=${token}`, permanent: false } };
}
export default function Again() { return null; }
