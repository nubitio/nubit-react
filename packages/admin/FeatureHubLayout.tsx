import type { ReactNode } from 'react';
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import './feature-hub.scss';

export interface FeatureHubTab {
  key: string;
  label: string;
  path: string;
  icon?: string;
  visible?: boolean;
}

export interface FeatureHubBanner {
  message: ReactNode;
  tone?: 'info' | 'warning';
  icon?: string;
  visible?: boolean;
  /** When false, compact density hides the banner to preserve grid space. Default: false */
  showInCompact?: boolean;
}

export type FeatureHubDensity = 'default' | 'compact';

export interface FeatureHubLayoutProps {
  title: string;
  subtitle?: ReactNode;
  tabs: FeatureHubTab[];
  /** Redirect here when pathname equals basePath exactly. */
  basePath: string;
  defaultPath: string;
  banner?: FeatureHubBanner;
  tabsAriaLabel?: string;
  /** Compact merges title + tabs on one row and hides the subtitle. */
  density?: FeatureHubDensity;
  className?: string;
}

function normalizeIcon(icon?: string): string | undefined {
  if (!icon) return undefined;
  if (icon.startsWith('ph ')) return icon;
  if (icon.startsWith('ph-')) return `ph ${icon}`;
  return `ph ph-${icon}`;
}

function normalizeBasePath(path: string): string {
  return path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;
}

export function FeatureHubLayout({
  title,
  subtitle,
  tabs,
  basePath,
  defaultPath,
  banner,
  tabsAriaLabel = 'Secciones',
  density = 'default',
  className = '',
}: FeatureHubLayoutProps) {
  const location = useLocation();
  const normalizedBase = normalizeBasePath(basePath);
  const visibleTabs = tabs.filter((tab) => tab.visible !== false);
  const compact = density === 'compact';
  const densityClass = compact ? ' nb-feature-hub--compact' : '';
  const showBanner =
    banner &&
    banner.visible !== false &&
    (!compact || banner.showInCompact === true);

  if (location.pathname === normalizedBase || location.pathname === `${normalizedBase}/`) {
    return <Navigate to={defaultPath} replace />;
  }

  const tabsNav = (
    <nav className="nb-feature-hub__tabs" aria-label={tabsAriaLabel}>
      {visibleTabs.map((tab) => {
        const iconClass = normalizeIcon(tab.icon);
        return (
          <NavLink
            key={tab.key}
            to={tab.path}
            className={({ isActive }) =>
              `nb-feature-hub__tab${isActive ? ' nb-feature-hub__tab--active' : ''}`
            }
          >
            {iconClass && <i className={iconClass} aria-hidden="true" />}
            {tab.label}
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <div className={`nb-feature-hub${densityClass}${className ? ` ${className}` : ''}`}>
      <header className="nb-feature-hub__header">
        {compact ? (
          <div className="nb-feature-hub__tabs-card">
            <h2 className="nb-feature-hub__title">{title}</h2>
            {tabsNav}
          </div>
        ) : (
          <>
            <h2 className="nb-feature-hub__title">{title}</h2>
            {subtitle && <p className="nb-feature-hub__subtitle">{subtitle}</p>}
            {tabsNav}
          </>
        )}
      </header>

      {showBanner && (
        <div
          className={`nb-feature-hub__banner nb-feature-hub__banner--${banner.tone ?? 'info'}`}
          role="status"
        >
          <i className={normalizeIcon(banner.icon ?? 'ph-info') ?? 'ph ph-info'} aria-hidden="true" />
          <span>{banner.message}</span>
        </div>
      )}

      <div className="nb-feature-hub__content">
        <Outlet />
      </div>
    </div>
  );
}