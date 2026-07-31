import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Top } from '@toss/tds-mobile';
import { AppDataProvider } from '@/lib/store';
import { FloatingTabBar } from './components/FloatingTabBar';
import { ScreenScaffold } from './components/ScreenScaffold';
import { EmptyState } from './components/StateView';
import Home from './pages/Home';

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

// 예산/기록/분석/시뮬의 실제 화면은 후속 패킷이 채운다. 그 전까지 방어용
// 플레이스홀더로 연결해 화면 하나의 부재가 라우팅/빌드를 깨지 않게 한다.
function Placeholder({ title, description }: { title: string; description: string }) {
  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>{title}</Top.TitleParagraph>} />}>
      <EmptyState title={title} description={description} />
    </ScreenScaffold>
  );
}

export default function App() {
  return (
    <AppDataProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/budget"
          element={
            <Placeholder
              title="예산 설정"
              description="이번 달 식비 예산을 정하면 끼니별 허용 금액을 계산해요"
            />
          }
        />
        <Route
          path="/record"
          element={
            <Placeholder
              title="식사 기록"
              description="먹은 끼니와 금액을 남기면 소비 패턴이 쌓여요"
            />
          }
        />
        <Route
          path="/records"
          element={<Placeholder title="기록" description="남긴 식사 기록이 여기 모여요" />}
        />
        <Route
          path="/analysis"
          element={<Placeholder title="분석" description="카테고리별 소비와 예산 페이스를 확인해요" />}
        />
        <Route
          path="/simulate"
          element={<Placeholder title="시뮬" description="다음 달 절약 목표를 미리 그려봐요" />}
        />
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
