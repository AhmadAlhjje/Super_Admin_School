import { InstituteOverview } from '../../shared';
import { SystemPanel } from './SystemPanel';

/** Super admin home: institute overview plus system health. */
export function SystemOverviewPage() {
  return (
    <>
      <InstituteOverview />
      <SystemPanel />
    </>
  );
}
