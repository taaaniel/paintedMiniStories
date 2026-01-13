import { useLocalSearchParams, usePathname, useRouter } from 'expo-router';
import React from 'react';
import PaintBankScreen from '../../screens/PaintBank/PaintBankScreen';

export const options = {
  title: 'Paint Bank',
};

const isTruthy = (v: unknown) => v === '1' || v === 'true' || v === true;
const isMy = (v: unknown) =>
  v === 'my' || v === 'mine' || v === 'myPaintBank' || v === 'my_paint_bank';

export default function PaintBankRoute() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams();

  React.useEffect(() => {
    // If anything tries to switch this screen to "My Paint Bank" via params, clear them and stay on list.
    const shouldClear =
      isTruthy(params.justAdded) ||
      isTruthy(params.redirectToMy) ||
      isMy(params.view) ||
      isMy(params.mode) ||
      isMy(params.tab) ||
      isMy(params.initialTab);

    if (!shouldClear) return;

    // Replace with the same route but without query params.
    router.replace(pathname as any);
  }, [params, pathname, router]);

  return <PaintBankScreen />;
}
