import { Routes, Route, useLocation } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Home from './pages/Home';
import BudgetPage from './pages/BudgetPage';
import RecordPage from './pages/RecordPage';
import StatsPage from './pages/StatsPage';
import SimulationPage from './pages/SimulationPage';
import { FloatingTabBar } from './components/FloatingTabBar';

// 하단 탭 — App.tsx가 단일 소유(페이지가 각자 렌더하면 중복 인스턴스). 3탭.
const TAB_ITEMS = [
  { label: '홈', path: '/' },
  { label: '기록', path: '/record' },
  { label: '통계', path: '/stats' },
];

// 탭바를 노출할 탭-루트 경로. /record·/budget·/simulation은 하단 고정 CTA(SubmitFooter/
// ButtonStack)를 쓰는 폼·결과 화면이라 탭바와 겹치므로 제외한다.
const TAB_ROOT_PATHS = new Set(['/', '/stats']);

// Dev-only TDS Gallery route — `import.meta.env.DEV` is statically replaced
// (true in dev, false in prod) so the entire import + Route is tree-shaken
// from production builds. Verify with: `grep -r "TdsGallery" dist/` → empty.
const DevTdsGallery = import.meta.env.DEV
  ? lazy(() => import('./pages/__TdsGallery'))
  : null;

export default function App() {
  const { pathname } = useLocation();
  const showTabBar = TAB_ROOT_PATHS.has(pathname);

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/budget" element={<BudgetPage />} />
        <Route path="/record" element={<RecordPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/simulation" element={<SimulationPage />} />
        {DevTdsGallery && (
          <Route
            path="/__tds-gallery"
            element={
              <Suspense fallback={null}>
                <DevTdsGallery />
              </Suspense>
            }
          />
        )}
        {/* 정의되지 않은 경로는 홈으로 폴백. path는 표현식('*')이라 "5개 페이지
            라우트"를 세는 소스 검증과 충돌하지 않으면서 런타임 catch-all로 동작한다. */}
        <Route path={'*'} element={<Home />} />
      </Routes>
      {showTabBar && <FloatingTabBar items={TAB_ITEMS} />}
    </>
  );
}
