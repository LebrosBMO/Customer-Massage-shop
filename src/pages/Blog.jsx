import { blogPosts } from '../data/content.js'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('mn-MN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function Blog() {
  return (
    <div className="section container">
      <header className="page-head">
        <h1>Тэмдэглэл</h1>
        <p>Амралт, зан үйл, удаашрахуйн урлагийн тухай тэмдэглэл.</p>
      </header>

      <div className="grid grid--3">
        {blogPosts.map((post) => (
          <article key={post.id} className="card">
            <div className="card__media" style={{ backgroundImage: `url(${post.image})` }} />
            <div className="card__body">
              <time className="card__date">{formatDate(post.date)}</time>
              <h2>{post.title}</h2>
              <p>{post.excerpt}</p>
              <a className="link-arrow" href="#">Дэлгэрэнгүй →</a>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
