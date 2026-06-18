'use client';

import React from 'react';
import Link from 'next/link';
import { UserRole } from './DashboardLayout';

export interface FooterProps {
  role: UserRole;
}

export function Footer({ role }: FooterProps) {
  const currentYear = new Date().getFullYear();

  const getFooterLinks = () => {
    const baseLinks = [
      { label: 'About', href: '/about' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' }
    ];

    switch (role.type) {
      case 'data-provider':
        return [
          { label: 'Provider Guide', href: '/docs/provider' },
          { label: 'Data Standards', href: '/docs/standards' },
          ...baseLinks
        ];

      case 'auditor':
        return [
          { label: 'Audit Guidelines', href: '/docs/audit' },
          { label: 'Compliance Framework', href: '/docs/compliance' },
          ...baseLinks
        ];

      case 'data-consumer':
        return [
          { label: 'Consumer Guide', href: '/docs/consumer' },
          { label: 'API Reference', href: '/docs/api' },
          ...baseLinks
        ];

      default:
        return baseLinks;
    }
  };

  const footerLinks = getFooterLinks();

  return (
    <footer className="footer bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
      <div className="footer-content max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand and description */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">SMPC Protocol</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Secure Multi-Party Computation</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
              Privacy-preserving data trading and computing platform powered by advanced cryptographic protocols.
              Enabling secure collaboration while protecting data privacy.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-3">
              Quick Links
            </h4>
            <ul className="space-y-2">
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* System Status */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-3">
              System Status
            </h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">SMPC Network</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Blockchain</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">IPFS Storage</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Auditing Service</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="footer-bottom mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
            <div className="flex items-center space-x-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                © {currentYear} SMPC Protocol. All rights reserved.
              </p>
              <div className="hidden sm:flex items-center space-x-2">
                <span className="text-xs text-gray-400">|</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Role: {role.displayName}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Network status indicator */}
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Online</span>
              </div>

              {/* Build version */}
              <div className="text-xs text-gray-400">
                v1.0.0-beta
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}