import { useState } from "react";
import { useAuth } from "react-oidc-context";
import { buildLogoutUrl } from "./auth";
import wavyBackground from "./assets/wavy.jpg";
import type { BillingPlan, ShortenResponse } from "./types";
import { freePermanentLinkLimit, PENDING_PLAN_KEY } from "./constants/misc";
import { formatAccess } from "./lib/format";

import { useTheme } from "./hooks/useTheme";
import { useToast } from "./hooks/useToast";
import { useConfirm } from "./hooks/useConfirm";
import { useGuestShorten } from "./hooks/useGuestShorten";
import { useLinks } from "./hooks/useLinks";
import { useBilling } from "./hooks/useBilling";
import { useAnalytics } from "./hooks/useAnalytics";
import { useQrCode } from "./hooks/useQrCode";
import { useAccountActions } from "./hooks/useAccountActions";
import { getIdentityProvider } from "./hooks/useIdentityProvider";

import { Header } from "./components/Header";
import { HeroSection } from "./components/HeroSection";
import { ShortenBox } from "./components/ShortenBox";
import { CreatedLinkCard } from "./components/CreatedLinkCard";
import { LinkCreatorStudio } from "./components/LinkCreatorStudio";
import { LinkManagerModal } from "./components/LinkManagerModal";
import { PricingSection } from "./components/PricingSection";
import { AccountSettingsModal } from "./components/AccountSettingsModal";
import { QrCodeModal } from "./components/QrCodeModal";
import { AnalyticsModal } from "./components/AnalyticsModal";
import { SiteFooter } from "./components/SiteFooter";
import { ToastViewport } from "./components/Toast";
import { ConfirmDialog } from "./components/ConfirmDialog";

import "./styles/index.css";

function App() {
  const auth = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast, showSuccess, showError, dismissToast } = useToast();
  const notify = { showSuccess, showError };
  const { confirmState, confirm, handleConfirm, handleCancel } = useConfirm();

  const [createdLink, setCreatedLink] = useState<ShortenResponse | null>(null);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showLinkManager, setShowLinkManager] = useState(false);

  const token = auth.user?.id_token;
  const accessToken = auth.user?.access_token;
  const isSignedIn = auth.isAuthenticated;
  const identityProvider = getIdentityProvider(auth.user);
  const isGoogleUser = identityProvider.toLowerCase() === "google";
  const isExternalProviderUser = Boolean(identityProvider);

  async function startSignIn(pendingPlan?: BillingPlan["id"]) {
    if (pendingPlan) sessionStorage.setItem(PENDING_PLAN_KEY, pendingPlan);

    try {
      await auth.signinRedirect({ extraQueryParams: { prompt: "login" } });
    } catch (error) {
      showError(error instanceof Error ? error.message : "Failed to open sign in");
    }
  }

  function copyText(value: string) {
    navigator.clipboard.writeText(value);
    showSuccess("Copied to clipboard.");
  }

  const guest = useGuestShorten(notify, setCreatedLink);
  const linksApi = useLinks(token, isSignedIn, notify);
  const billing = useBilling(token, isSignedIn, auth.user?.profile.email, startSignIn, notify);
  const analytics = useAnalytics(token, notify);
  const qr = useQrCode(token, notify);

  async function handleAccountDeleted() {
    await auth.removeUser();
    window.location.href = buildLogoutUrl();
  }

  const account = useAccountActions(
    token,
    accessToken,
    isExternalProviderUser,
    notify,
    confirm,
    handleAccountDeleted
  );

  async function signOut() {
    setShowAccountSettings(false);
    setShowLinkManager(false);
    setCreatedLink(null);
    analytics.closeAnalytics();
    qr.closeQr();

    await auth.removeUser();
    window.location.href = buildLogoutUrl();
  }

  async function handleCreateStudioLink(payload: Parameters<typeof linksApi.createLink>[0]) {
    const result = await linksApi.createLink(payload);
    if (result) setCreatedLink(result);
    return result;
  }

  async function handleDeleteLink(code: string) {
    const confirmed = await confirm({
      title: "Delete this link?",
      description: `Permanently delete ${code.toLowerCase()}? This will remove it from your dashboard and delete its click history. are you sure?`,
      confirmLabel: "Delete link",
      danger: true,
    });

    if (!confirmed) return;

    await linksApi.deleteLink(code);
    analytics.forgetDeletedLink(code);
    qr.forgetDeletedLink(code);
  }

  const freePermanentLinksLeft = Math.max(
    freePermanentLinkLimit - linksApi.permanentManagedLinks,
    0
  );
  const planName = billing.currentPlan?.planName || "Go Free";
  const planAccessLabel = formatAccess(billing.currentPlan?.accessUntil);

  return (
    <main className={`bitlyShell ${theme}`} style={{ ["--bg-image" as string]: `url(${wavyBackground})` }}>
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        authLoading={auth.isLoading}
        isSignedIn={isSignedIn}
        userEmail={auth.user?.profile.email}
        hasPaidPlan={billing.hasPaidPlan()}
        onOpenSettings={() => setShowAccountSettings(true)}
        onSignOut={signOut}
        onSignIn={() => startSignIn()}
      />

      {!isSignedIn && <HeroSection onGetStarted={() => startSignIn()} />}

      {!isSignedIn && (
        <ShortenBox
          url={guest.guestUrl}
          onUrlChange={guest.setGuestUrl}
          expiresIn={guest.guestExpiresIn}
          onExpiresInChange={guest.setGuestExpiresIn}
          loading={guest.loading}
          onSubmit={guest.createTemporaryLink}
        />
      )}

      {auth.error && <section className="messageBox errorBox">Auth error: {auth.error.message}</section>}

      {createdLink && <CreatedLinkCard link={createdLink} onCopy={copyText} />}

      {isSignedIn && (
        <LinkCreatorStudio
          planName={planName}
          hasPaidPlan={billing.hasPaidPlan()}
          currentPlan={billing.currentPlan}
          planAccessLabel={planAccessLabel}
          freePermanentLinksLeft={freePermanentLinksLeft}
          permanentManagedLinks={linksApi.permanentManagedLinks}
          temporaryManagedLinks={linksApi.temporaryManagedLinks}
          totalClicks={linksApi.stats.totalClicks}
          activeLinks={linksApi.stats.activeLinks}
          loading={linksApi.actionLoading}
          onOpenLinkManager={() => setShowLinkManager(true)}
          onCreate={handleCreateStudioLink}
          showError={showError}
        />
      )}

      {isSignedIn && showLinkManager && (
        <LinkManagerModal
          onClose={() => setShowLinkManager(false)}
          links={linksApi.links}
          filteredLinks={linksApi.filteredLinks}
          stats={linksApi.stats}
          searchQuery={linksApi.linkSearchQuery}
          onSearchChange={linksApi.setLinkSearchQuery}
          dashboardLoading={linksApi.dashboardLoading}
          actionLoading={linksApi.actionLoading}
          onRefresh={linksApi.loadLinks}
          onCopy={copyText}
          onOpenAnalytics={(code) => {
            qr.closeQr();
            analytics.loadClicks(code);
          }}
          onOpenQr={(code) => {
            analytics.closeAnalytics();
            qr.loadQrCode(code);
          }}
          onUpdateStatus={linksApi.updateLinkStatus}
          onUpdateDetails={linksApi.updateLinkDetails}
          onDeleteRequest={handleDeleteLink}
        />
      )}

      <PricingSection
        show={billing.shouldShowPricingCards()}
        isSignedIn={isSignedIn}
        billingStatusLoaded={billing.billingStatusLoaded}
        currentPlan={billing.currentPlan}
        billingLoadingPlan={billing.billingLoadingPlan}
        onChoosePlan={billing.choosePlan}
      />

      {isSignedIn && showAccountSettings && (
        <AccountSettingsModal
          onClose={() => setShowAccountSettings(false)}
          userEmail={auth.user?.profile.email}
          userSub={auth.user?.profile.sub}
          identityProvider={identityProvider}
          isGoogleUser={isGoogleUser}
          isExternalProviderUser={isExternalProviderUser}
          {...account}
        />
      )}

      {isSignedIn && qr.qrCode && (
        <QrCodeModal
          code={qr.qrCode}
          svg={qr.qrSvg}
          loading={qr.qrLoading}
          onDownload={qr.downloadQrSvg}
          onClose={qr.closeQr}
        />
      )}

      {isSignedIn && analytics.selectedCode && (
        <AnalyticsModal
          code={analytics.selectedCode}
          summary={analytics.analyticsSummary}
          limited={analytics.analyticsLimited}
          visibleClickLimit={analytics.visibleClickLimit}
          upgradeMessage={analytics.analyticsUpgradeMessage}
          clicks={analytics.clicks}
          onClose={analytics.closeAnalytics}
        />
      )}

      <SiteFooter />

      <ToastViewport toast={toast} onDismiss={dismissToast} />

      {confirmState && (
        <ConfirmDialog {...confirmState} onConfirm={handleConfirm} onCancel={handleCancel} />
      )}
    </main>
  );
}

export default App;
