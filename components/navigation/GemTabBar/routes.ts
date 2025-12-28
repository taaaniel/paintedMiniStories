export const TabRoutes = {
  Dashboard: 'dashboard',
  Projects: 'projects',
  AddNewProject: 'addNewProject',
  PaintBank: 'paintBank',
  Settings: 'settings',
  ProjectDetail: 'projects/[id]',
} as const;

export type TabRouteName = (typeof TabRoutes)[keyof typeof TabRoutes];

export const MAIN_TAB_ROUTES: ReadonlySet<string> = new Set([
  TabRoutes.Projects,
  TabRoutes.Dashboard,
  TabRoutes.Settings,
]);

export const PRIMARY_ICON_TAB_ROUTES: ReadonlySet<string> = new Set([
  TabRoutes.Projects,
  TabRoutes.AddNewProject,
]);
