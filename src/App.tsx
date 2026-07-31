import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AppDataProvider } from '@/lib/store';
import { FloatingTabBar } from './components/FloatingTabBar';
import Home from './pages/Home';
import Budget from './pages/Budget';
import Record from './pages/Record';
import Records from './pages/Records';
import Analysis from './pages/Analysis';
import Simulate from './pages/Simulate';

// Dev-only TDS Gallery route — `import.meta.env.DEV` is statically replaced
// (true in dev, false in prod) so the entire import + Route is tree-shaken
// from production builds. Verify with: `grep -r "TdsGallery" dist/` → empty.
const DevTdsGallery = import.meta.env.DEV
  ? lazy(() => import('./pages/__TdsGallery'))
  : null;

// 하단 탭 4개(홈/기록/분석/시뮬) — App 레벨 chrome이라 모든 라우트에서 유지된다.
// 활성 표시는 FloatingTabBar가 현재 경로로 자동 처리(솔리드 알약 금지, 컬러 틴트).
const TABS = [
  { label: '홈', path: '/' },
  { label: '기록', path: '/records' },
  { label: '분석', path: '/analysis' },
  { label: '시뮬', path: '/simulate' },
];

// RouteState(src/lib/types.ts)의 6개 경로를 실제 페이지에 배선한다. 예산/기록 입력은
// 탭이 아니라 화면 내 버튼으로 진입하므로 라우트만 두고 탭바에는 넣지 않는다.
export default function App() {
  return (
    <AppDataProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/budget" element={<Budget />} />
        <Route path="/record" element={<Record />} />
        <Route path="/records" element={<Records />} />
        <Route path="/analysis" element={<Analysis />} />
        <Route path="/simulate" element={<Simulate />} />
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
      </Routes>
      <FloatingTabBar items={TABS} />
    </AppDataProvider>
  );
}
