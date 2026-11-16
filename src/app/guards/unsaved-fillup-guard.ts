import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';
import type { FillupFormPage } from '../pages/fillup-form/fillup-form.page';
export const unsavedFillupGuard: CanDeactivateFn<FillupFormPage> = async (component) => {
  if (!component.form.dirty || component.busy()) return true;
  const alerts = inject(AlertController);
  const alert = await alerts.create({
    header: 'Leave this fill-up?',
    message: 'Your unsaved changes will be discarded.',
    buttons: [
      { text: 'Keep editing', role: 'cancel' },
      { text: 'Discard changes', role: 'destructive' },
    ],
  });
  await alert.present();
  return (await alert.onDidDismiss()).role === 'destructive';
};
