import { bootstrapApplication } from '@angular/platform-browser';
import { DEFAULT_OPTIONS as NOTYF_DEFAULTS } from 'notyf';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// Toasts are created with `new Notyf()` across the app; the library default (2s)
// hides messages before users can read them. Instances merge these defaults at
// construction, so components that pass their own options are unaffected.
NOTYF_DEFAULTS.duration = 5000;
NOTYF_DEFAULTS.dismissible = true;

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
