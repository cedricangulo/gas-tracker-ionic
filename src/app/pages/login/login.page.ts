import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [FormsModule, IonContent],
})
export class LoginPage {
  readonly auth = inject(Auth);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly username = signal('');
  readonly password = signal('');
  readonly busy = signal(false);

  ionViewWillEnter(): void {
    this.username.set('');
    this.password.set('');
    this.auth.error.set('');
    this.busy.set(false);
  }

  async signIn(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      await this.auth.login(this.username(), this.password());
      this.username.set('');
      this.password.set('');
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
      const destination =
        returnUrl?.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/home';
      await this.router.navigateByUrl(destination);
    } catch {
      // Auth exposes a plain message for the form.
    } finally {
      this.busy.set(false);
    }
  }
}
