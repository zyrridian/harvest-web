import { getApiDocs } from '@/core/swagger/swagger';
import ReactSwagger from './react-swagger';

export default async function ApiDocsPage() {
  const spec = await getApiDocs();
  
  return (
    <section className="min-h-screen bg-white">
      <div className="container mx-auto">
        <ReactSwagger spec={spec} />
      </div>
    </section>
  );
}
