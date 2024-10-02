"use client";
import React from "react";

function MainComponent() {
  const [title, setTitle] = React.useState("");
  const [outline, setOutline] = React.useState("");
  const [keywords, setKeywords] = React.useState("");
  const [content, setContent] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [imageResults, setImageResults] = React.useState([]);
  const [postedContents, setPostedContents] = React.useState([]);
  const [showAllContentsPage, setShowAllContentsPage] = React.useState(false);
  const [contentType, setContentType] = React.useState("article");

  React.useEffect(() => {
    const savedContents = localStorage.getItem("postedContents");
    if (savedContents) {
      setPostedContents(JSON.parse(savedContents));
    }
  }, []);

  const generateContent = async () => {
    setIsLoading(true);
    try {
      const prompt =
        contentType === "novel"
          ? "魅力的な短編小説を生成してください。タイトル、あらすじ、キーワードを考慮し、読者を引き付ける物語を作成してください。キャラクターの発展、プロットの展開、テーマの探求を含め、印象的な短編小説を書いてください。"
          : "SEO最適化された詳細なブログ記事を生成してください。タイトル、記事の内容、キーワードを考慮し、読者を引き付ける魅力的で豊富な内容を作成してください。少なくとも1000字以上の記事を生成し、実例や統計データを含めて、より深い洞察を提供してください。記事の構成は、はじめに、本文（主要なポイント3つ程度）、まとめの形式で作成してください。また、メタディスクリプションとOGPの説明文も含めてください。";

      const response = await fetch(
        "/integrations/anthropic-claude-sonnet-3-5/",
        {
          method: "POST",
          body: JSON.stringify({
            messages: [
              { role: "system", content: prompt },
              {
                role: "user",
                content: `タイトル: ${title}\n${
                  contentType === "novel" ? "あらすじ" : "内容"
                }: ${outline}\nキーワード: ${keywords}`,
              },
            ],
          }),
        }
      );
      const data = await response.json();
      const generatedContent = data.choices[0].message.content;

      const imagePrompt = `${title}に関連する画像。キーワード: ${keywords}`;
      const imageResponse = await fetch(
        `/integrations/dall-e-3/?prompt=${encodeURIComponent(imagePrompt)}`,
        {
          method: "GET",
        }
      );
      const imageData = await imageResponse.json();
      const generatedImages = imageData.data;

      const contentWithImages = insertImagesIntoContent(
        generatedContent,
        generatedImages
      );
      setContent(contentWithImages);

      const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
      const url = `/${contentType}s/${id}`;
      const newContent = {
        id,
        url,
        title,
        content: contentWithImages,
        keywords: keywords ? keywords.split(",").map((k) => k.trim()) : [],
        date: new Date().toISOString(),
        type: contentType,
      };
      addPostedContent(newContent);

      await fetch("/api/handler", {
        method: "POST",
        body: JSON.stringify(newContent),
      });
    } catch (error) {
      console.error("エラーが発生しました:", error);
    }
    setIsLoading(false);
  };

  const insertImagesIntoContent = (content, images) => {
    const paragraphs = content.split("\n\n");
    const imageCount = images.length;
    const spacing = Math.max(
      1,
      Math.floor(paragraphs.length / (imageCount + 1))
    );

    const result = [];
    let imageIndex = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      result.push({ type: "text", content: paragraphs[i] });
      if (i % spacing === 0 && imageIndex < imageCount) {
        result.push({
          type: "image",
          src: images[imageIndex],
          alt: `関連画像 ${imageIndex + 1}`,
        });
        imageIndex++;
      }
    }

    return result;
  };

  const addPostedContent = (content) => {
    const updatedContents = [content, ...postedContents];
    setPostedContents(updatedContents);
    localStorage.setItem("postedContents", JSON.stringify(updatedContents));
  };

  if (showAllContentsPage) {
    return (
      <AllContentsPage
        postedContents={postedContents}
        onBack={() => setShowAllContentsPage(false)}
      />
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-100 text-gray-800 font-sans">
      <div className="w-full md:w-1/3 p-4 bg-white shadow-md">
        <h2 className="text-2xl font-bold mb-4 text-blue-600">
          コンテンツジェネレーター
        </h2>
        <div className="mb-4">
          <label className="inline-flex items-center mr-4">
            <input
              type="radio"
              className="form-radio"
              name="contentType"
              value="article"
              checked={contentType === "article"}
              onChange={() => setContentType("article")}
            />
            <span className="ml-2">ブログ記事</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              className="form-radio"
              name="contentType"
              value="novel"
              checked={contentType === "novel"}
              onChange={() => setContentType("novel")}
            />
            <span className="ml-2">小説</span>
          </label>
        </div>
        <input
          type="text"
          placeholder={
            contentType === "novel" ? "小説のタイトル" : "記事タイトル"
          }
          className="w-full p-2 mb-4 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          placeholder={
            contentType === "novel"
              ? "小説のあらすじ"
              : "記事の内容（例：はじめに、主要なポイント3つ、まとめ）"
          }
          className="w-full p-2 mb-4 border border-gray-300 rounded h-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={outline}
          onChange={(e) => setOutline(e.target.value)}
        />
        <input
          type="text"
          placeholder="キーワード（カンマ区切り）"
          className="w-full p-2 mb-4 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
        />
        <button
          onClick={generateContent}
          className="w-full p-2 bg-gray-700 text-white rounded hover:bg-gray-600"
          disabled={isLoading}
        >
          {isLoading
            ? `${contentType === "novel" ? "小説" : "記事"}の生成中...`
            : contentType === "novel"
            ? "小説を生成"
            : "記事を生成"}
        </button>
        <button
          onClick={() => setShowAllContentsPage(true)}
          className="w-full p-2 bg-purple-500 text-white rounded hover:bg-purple-600 mt-4"
        >
          全てのコンテンツを表示
        </button>
      </div>

      <div className="w-full md:w-2/3 p-4 overflow-auto bg-white shadow-md ml-0 md:ml-4 mt-4 md:mt-0">
        <h2 className="text-2xl font-bold mb-4 text-blue-600">
          生成された{contentType === "novel" ? "小説" : "記事"}
        </h2>
        {isLoading ? (
          <p className="text-center text-gray-600">
            {contentType === "novel" ? "小説" : "記事"}を生成中...
          </p>
        ) : (
          <div className="prose prose-lg max-w-none">
            {content &&
              content.map((item, index) =>
                item.type === "text" ? (
                  <p key={index} className="mb-4 leading-relaxed">
                    {item.content}
                  </p>
                ) : (
                  <img
                    key={index}
                    src={item.src}
                    alt={item.alt}
                    className="w-full max-w-2xl mx-auto my-8 rounded-lg shadow-lg"
                  />
                )
              )}
          </div>
        )}

        {imageResults.length > 0 && (
          <div className="mt-12 bg-gray-50 p-6 rounded-lg shadow">
            <h3 className="text-xl font-bold mb-4 text-blue-600">関連画像</h3>
            <div className="flex flex-wrap gap-4">
              {imageResults.map((image, index) => (
                <img
                  key={index}
                  src={image.originalImageUrl}
                  alt={image.title}
                  className="w-24 h-24 object-cover rounded-md shadow hover:shadow-lg transition-shadow duration-300"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AllContentsPage({ postedContents, onBack }) {
  const [selectedContent, setSelectedContent] = React.useState(null);

  if (selectedContent) {
    return (
      <div className="p-4 bg-white shadow-md">
        <button
          onClick={() => setSelectedContent(null)}
          className="mb-4 text-blue-600 hover:underline"
        >
          &larr; 戻る
        </button>
        <h1 className="text-3xl font-bold mb-4">{selectedContent.title}</h1>
        <div className="prose prose-lg max-w-none">
          {selectedContent.content.map((item, index) =>
            item.type === "text" ? (
              <p key={index} className="mb-4 leading-relaxed">
                {item.content}
              </p>
            ) : (
              <img
                key={index}
                src={item.src}
                alt={item.alt}
                className="w-full max-w-2xl mx-auto my-8 rounded-lg shadow-lg"
              />
            )
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white shadow-md">
      <button onClick={onBack} className="mb-4 text-blue-600 hover:underline">
        &larr; 戻る
      </button>
      <h2 className="text-2xl font-bold mb-4 text-blue-600">
        全てのコンテンツ
      </h2>
      {postedContents.length > 0 ? (
        <ul className="space-y-4">
          {postedContents.map((content) => (
            <li key={content.id} className="border-b pb-4">
              <h3 className="text-xl font-semibold mb-2">{content.title}</h3>
              <p className="text-sm text-gray-500">ID: {content.id}</p>
              <p className="text-sm text-gray-500">
                キーワード: {content.keywords?.join(", ")}
              </p>
              <p className="text-sm text-gray-500">
                投稿日時: {new Date(content.date).toLocaleString()}
              </p>
              <button
                onClick={() => setSelectedContent(content)}
                className="text-blue-500 hover:underline"
              >
                全文を読む
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-600">まだコンテンツがありません。</p>
      )}
    </div>
  );
}

export default MainComponent;