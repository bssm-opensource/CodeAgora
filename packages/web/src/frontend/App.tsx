import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout.js';
import { Dashboard } from './pages/Dashboard.js';
import { Sessions } from './pages/Sessions.js';
import { ReviewDetail } from './pages/ReviewDetail.js';
import { Models } from './pages/Models.js';
import { Costs } from './pages/Costs.js';
import { Discussions } from './pages/Discussions.js';
import { ConfigPage } from './pages/Config.js';
import { Pipeline } from './pages/Pipeline.js';
import { Compare } from './pages/Compare.js';
import { NotFound } from './components/NotFound.js';

export function App(): React.JSX.Element {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/sessions" element={<Sessions />} />
        <Route path="/sessions/:date/:id" element={<ReviewDetail />} />
        <Route path="/models" element={<Models />} />
        <Route path="/costs" element={<Costs />} />
        <Route path="/discussions" element={<Discussions />} />
        <Route path="/config" element={<ConfigPage />} />
        <Route path="/pipeline" element={<Pipeline />} />
        <Route path="/compare/:dateA/:idA/:dateB/:idB" element={<Compare />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}
