import Link from "next/link";

export default function BlogPage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-24">
      <h1 className="font-serif text-5xl uppercase mb-12">Blog</h1>
      <p className="text-lg text-gray-600 mb-8">Read our latest articles and teachings.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Sample Blog Posts */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white border border-gray-200 p-6">
            <div className="bg-gray-100 h-48 mb-4"></div>
            <span className="text-primary font-bold text-xs uppercase">October {i + 10}</span>
            <h3 className="font-serif text-xl mb-2">Mastering Your Inner World</h3>
            <p className="text-gray-600 text-sm mb-4">Until you change your perspective, you will never change your potential.</p>
            <Link href="/blog/create" className="text-primary font-bold uppercase text-xs tracking-widest">Read More →</Link>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center">
        <Link href="/blog/create" className="btn-ash">Create New Post</Link>
      </div>
    </div>
  );
}