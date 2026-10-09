import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Home } from "./components/Home";
import { ArticleView } from "./components/ArticleView";
import { CategoryView } from "./components/CategoryView";
import { SearchView } from "./components/SearchView";
import { ArticleEditor } from "./components/ArticleEditor";
import { WorldGraph } from "./components/WorldGraph";
import { WorldMap } from "./components/WorldMap";
import { TarotAnalyzer } from "./components/TarotAnalyzer";
import { TarotChatbot } from "./components/TarotChatbot";
import { FilterManager } from "./components/FilterManager";
import { DiarioCazador } from "./components/DiarioCazador";
import { SpellbookView } from "./components/SpellbookView";
import { DMSanctum } from "./components/DMSanctum";
import { BulkImportProvider } from "./context/BulkImportContext";
import { CategoryProvider } from "./context/CategoryContext";
import { LanguageProvider } from "./context/LanguageContext";
import { VisualEditorProvider } from "./context/VisualEditorContext";
import { UIContentProvider } from "./context/UIContentContext";
import { FloatingMapProvider } from "./context/FloatingMapContext";
import { FloatingMapContainer } from "./components/FloatingMapContainer";
import { ErrorBoundary } from "./components/ErrorBoundary";

export default function App() {
  return (
    <ErrorBoundary fallbackTitle="Ha ocurrido un error en la aplicación">
      <BrowserRouter>
        <LanguageProvider>
          <CategoryProvider>
            <BulkImportProvider>
              <VisualEditorProvider>
                <UIContentProvider>
                  <FloatingMapProvider>
                    <FloatingMapContainer />
                    <Routes>
                      <Route path="/tarot-chat" element={<TarotChatbot standalone={true} />} />
                      <Route path="/*" element={
                        <Layout>
                        <Routes>
                          <Route path="/" element={<Home />} />
                          <Route path="/articulo/:slug" element={<ArticleView />} />
                          <Route path="/articulos/:slug" element={<ArticleView />} />
                          <Route path="/wiki/:slug" element={<ArticleView />} />
                          <Route path="/wiki/articulo/:slug" element={<ArticleView />} />
                          <Route path="/tomo/:slug" element={<ArticleView />} />
                          <Route path="/tomos/:slug" element={<ArticleView />} />
                          <Route path="/entry/:slug" element={<ArticleView />} />
                          <Route path="/post/:slug" element={<ArticleView />} />
                          <Route path="/p/:slug" element={<ArticleView />} />
                          <Route path="/categoria/:slug" element={<CategoryView />} />
                          <Route path="/buscar" element={<SearchView />} />
                          <Route path="/nuevo" element={<ArticleEditor />} />
                          <Route path="/editar/:slug" element={<ArticleEditor />} />
                          <Route path="/grafo" element={<WorldGraph />} />
                          <Route path="/grafos" element={<WorldGraph />} />
                          <Route path="/mundo" element={<WorldMap />} />
                          <Route path="/spellbook" element={<SpellbookView />} />
                          <Route path="/hechizos" element={<SpellbookView />} />
                          <Route path="/libro-de-hechizos" element={<SpellbookView />} />
                          <Route path="/filtros" element={<FilterManager />} />
                          <Route path="/tarot-ai" element={<TarotAnalyzer />} />
                          <Route path="/diario" element={<DiarioCazador />} />
                          <Route path="/dm-sanctum" element={<DMSanctum />} />
                          <Route path="/dm" element={<DMSanctum />} />
                        </Routes>
                      </Layout>
                    } />
                  </Routes>
                </FloatingMapProvider>
              </UIContentProvider>
              </VisualEditorProvider>
            </BulkImportProvider>
          </CategoryProvider>
        </LanguageProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
