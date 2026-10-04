import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppRoot } from './app-root';
import { routes } from './app.routes';

describe('AppRoot', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppRoot],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('creates the root router host', () => {
    const fixture = TestBed.createComponent(AppRoot);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('lazy-loads each feature route', () => {
    const shell = routes.find((route) => route.path === '');
    expect(typeof shell?.loadComponent).toBe('function');
    expect(typeof shell?.children?.find((route) => route.path === 'dashboard')?.loadComponent).toBe('function');
    expect(typeof shell?.children?.find((route) => route.path === 'vocabulary')?.loadChildren).toBe('function');
    expect(typeof shell?.children?.find((route) => route.path === 'history')?.loadComponent).toBe('function');
  });
});
