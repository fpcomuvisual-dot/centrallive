export default function ErpStatusBanner({ online }) {
  if (online) return null;
  return (
    <div role="alert" className="bg-red-100 border border-red-400 text-red-800 px-4 py-2 text-sm">
      ERP offline — carrinhos suspensos
    </div>
  );
}
