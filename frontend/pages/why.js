import Head from "next/head";

export default function WhyPage() {
  const pillars = [
    {
      title: "複雑化するデータ分析",
      description:
        "企業や自治体では多様なデータが日々生まれていますが、分析の専門知識がないと活用できないケースが多く、意思決定の遅れや勘に頼った運用が発生しています。",
    },
    {
      title: "現場と経営の分断",
      description:
        "現場担当者は状況を肌で感じている一方で、経営層に迅速かつ正確に伝える仕組みが整っておらず、重要なシグナルが埋もれてしまいます。",
    },
    {
      title: "AI導入のハードル",
      description:
        "AIを業務に取り入れたいと考えても、専門人材の採用や学習データの整備など初期コストが高く、試行錯誤の段階で挫折してしまう組織が少なくありません。",
    },
  ];

  const values = [
    {
      title: "ノーコードで分析を開始",
      body:
        "ドラッグ＆ドロップでデータをアップロードするだけで、AIが最適な可視化と洞察を提示。専門家がいなくてもデータドリブンな判断が可能になります。",
    },
    {
      title: "現場の声を素早く共有",
      body:
        "部門横断で使えるダッシュボードを通じて、現場の気づきやKPIの変化を経営層へ即座に届け、全体最適を実現します。",
    },
    {
      title: "セキュアで持続可能なAI活用",
      body:
        "厳格な認証と権限管理、国際基準に準拠したセキュリティで安心してAIを業務に取り入れられます。継続的なアップデートで最新の技術も享受できます。",
    },
  ];

  return (
    <>
      <Head>
        <title>なぜこのサービスが必要なのか | Rashinban</title>
        <meta
          name="description"
          content="Rashinbanがなぜ必要なのかを、現場の課題と提供価値の観点からご紹介します。"
        />
      </Head>
      <main className="min-h-screen bg-slate-50 text-slate-800">
        <section className="mx-auto max-w-4xl px-6 py-16">
          <p className="text-sm font-medium text-indigo-600">OUR MISSION</p>
          <h1 className="mt-4 text-3xl font-bold sm:text-4xl">
            なぜこのサービスが必要なのか
          </h1>
          <p className="mt-6 text-lg leading-relaxed">
            Rashinbanは、現場の勘や経験に頼りがちな意思決定をデータドリブンに変革するために生まれました。
            データ収集から分析、そして組織全体での共有までをスムーズにつなぎ、誰もが自信を持って次の一手を描ける状態を提供します。
          </p>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-5xl px-6 py-14">
            <h2 className="text-2xl font-semibold text-slate-900">
              いま、多くの組織が直面している課題
            </h2>
            <div className="mt-8 grid gap-8 md:grid-cols-3">
              {pillars.map((pillar) => (
                <article
                  key={pillar.title}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-sm"
                >
                  <h3 className="text-xl font-semibold text-slate-900">
                    {pillar.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-700">
                    {pillar.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-2xl font-semibold text-slate-900">
            Rashinbanが提供する価値
          </h2>
          <div className="mt-8 space-y-10">
            {values.map((value) => (
              <article key={value.title} className="rounded-lg bg-white p-8 shadow">
                <h3 className="text-xl font-semibold text-slate-900">
                  {value.title}
                </h3>
                <p className="mt-4 text-base leading-7 text-slate-700">
                  {value.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-indigo-600">
          <div className="mx-auto max-w-4xl px-6 py-16 text-white">
            <h2 className="text-2xl font-semibold">私たちが目指す未来</h2>
            <p className="mt-4 text-base leading-7 text-indigo-100">
              データに強い一部の専門家だけでなく、すべてのメンバーが洞察を得て動ける組織を当たり前にすること。
              それがRashinbanの掲げるビジョンです。現場の変化を素早く捉え、正しい方向に舵を切るための羅針盤として、
              あなたのチームを支えます。
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
