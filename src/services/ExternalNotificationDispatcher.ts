/**
 * External Notification Dispatcher
 * Handles sending notifications via Email, Push, SMS, and WhatsApp
 * based on user preferences
 */

export interface NotificationPreferences {
  email: {
    enabled: boolean;
    approvals: boolean;
    updates: boolean;
    reminders: boolean;
  };
  push: {
    enabled: boolean;
    approvals: boolean;
    updates: boolean;
    reminders: boolean;
  };
  sms: {
    enabled: boolean;
    approvals: boolean;
    updates: boolean;
    reminders: boolean;
  };
  whatsapp: {
    enabled: boolean;
    approvals: boolean;
    updates: boolean;
    reminders: boolean;
  };
}

export interface NotificationContent {
  type: 'approval' | 'update' | 'reminder';
  documentTitle: string;
  submitter: string;
  priority: string;
  dueDate?: string;
  approvalCenterLink: string;
  recipientName: string;
}

class ExternalNotificationDispatcherClass {
  /**
   * Get recipient's notification preferences from localStorage
   */
  private getRecipientPreferences(recipientId: string): NotificationPreferences | null {
    try {
      // Try to get user-specific preferences
      const userPrefs = localStorage.getItem(`notification-preferences-${recipientId}`);
      if (userPrefs) {
        return JSON.parse(userPrefs);
      }
      
      // Fallback to default preferences (if user is currently logged in)
      const defaultPrefs = localStorage.getItem('notification-preferences');
      if (defaultPrefs) {
        return JSON.parse(defaultPrefs);
      }
      
      return null;
    } catch (error) {
      console.error('Error loading notification preferences:', error);
      return null;
    }
  }

  /**
   * Send Email Notification
   */
  private async sendEmail(recipientEmail: string, content: NotificationContent): Promise<boolean> {
    console.log('📧 Sending Email Notification to:', recipientEmail);
    
    // TODO: Replace with actual email API call
    // Example: SendGrid, AWS SES, Nodemailer, etc.
    
    const emailContent = {
      to: recipientEmail,
      subject: `${content.type === 'approval' ? '📋 New Document' : '🔔 Document Update'} - ${content.documentTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">${content.type === 'approval' ? 'New Document Pending Your Approval' : 'Document Update'}</h2>
          <p>Hello ${content.recipientName},</p>
          <p><strong>${content.submitter}</strong> has submitted a document that requires your attention:</p>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Document:</strong> ${content.documentTitle}</p>
            <p><strong>Priority:</strong> <span style="color: ${content.priority === 'high' || content.priority === 'urgent' ? '#dc2626' : '#059669'};">${content.priority.toUpperCase()}</span></p>
            ${content.dueDate ? `<p><strong>Due Date:</strong> ${content.dueDate}</p>` : ''}
          </div>
          <a href="${content.approvalCenterLink}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px 0;">View in Approval Center</a>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">This is an automated notification from your Document Management System.</p>
        </div>
      `
    };
    
    // Simulate API call
    console.log('📧 Email content prepared:', emailContent);
    
    // In production, replace with:
    // const response = await fetch('/api/send-email', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(emailContent)
    // });
    // return response.ok;
    
    return true; // Simulated success
  }

  /**
   * Send Push Notification
   */
  private async sendPushNotification(recipientId: string, content: NotificationContent): Promise<boolean> {
    console.log('🔔 Sending Push Notification to:', recipientId);
    
    // TODO: Replace with actual push notification service
    // Example: Firebase Cloud Messaging (FCM), OneSignal, etc.
    
    const pushContent = {
      title: content.type === 'approval' ? 'New Document for Approval' : 'Document Update',
      body: `${content.documentTitle} - Priority: ${content.priority}`,
      icon: '/notification-icon.png',
      badge: '/badge-icon.png',
      data: {
        url: content.approvalCenterLink,
        documentTitle: content.documentTitle,
        priority: content.priority
      }
    };
    
    console.log('🔔 Push notification prepared:', pushContent);
    
    // In production, replace with:
    // if ('Notification' in window && Notification.permission === 'granted') {
    //   new Notification(pushContent.title, {
    //     body: pushContent.body,
    //     icon: pushContent.icon,
    //     badge: pushContent.badge,
    //     data: pushContent.data
    //   });
    // }
    
    return true; // Simulated success
  }

  /**
   * Send SMS Notification
   */
  private async sendSMS(recipientPhone: string, content: NotificationContent): Promise<boolean> {
    console.log('📱 Sending SMS to:', recipientPhone);
    
    // TODO: Replace with actual SMS API
    // Example: Twilio, AWS SNS, etc.
    
    const smsContent = {
      to: recipientPhone,
      message: `${content.type === 'approval' ? 'New Approval Required' : 'Update'}: ${content.documentTitle} (Priority: ${content.priority}). View in Approval Center: ${content.approvalCenterLink}`
    };
    
    console.log('📱 SMS content prepared:', smsContent);
    
    // In production, replace with:
    // const response = await fetch('/api/send-sms', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(smsContent)
    // });
    // return response.ok;
    
    return true; // Simulated success
  }

  /**
   * Send WhatsApp Notification
   */
  private async sendWhatsApp(recipientPhone: string, content: NotificationContent): Promise<boolean> {
    console.log('💬 Sending WhatsApp message to:', recipientPhone);
    
    // TODO: Replace with actual WhatsApp Business API
    // Example: Twilio WhatsApp, Meta WhatsApp Business API, etc.
    
    const whatsappContent = {
      to: recipientPhone,
      message: `*${content.type === 'approval' ? '📋 New Document for Approval' : '🔔 Document Update'}*\n\nHello ${content.recipientName},\n\n*Document:* ${content.documentTitle}\n*Submitted by:* ${content.submitter}\n*Priority:* ${content.priority.toUpperCase()}\n${content.dueDate ? `*Due Date:* ${content.dueDate}\n` : ''}\n\nView in Approval Center:\n${content.approvalCenterLink}`
    };
    
    console.log('💬 WhatsApp content prepared:', whatsappContent);
    
    // In production, replace with:
    // const response = await fetch('/api/send-whatsapp', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(whatsappContent)
    // });
    // return response.ok;
    
    return true; // Simulated success
  }

  /**
   * Main function to notify a recipient based on their preferences
   */
  public async notifyRecipient(
    recipientId: string,
    recipientName: string,
    content: NotificationContent
  ): Promise<{ success: boolean; channels: string[] }> {
    console.log(`🔔 ExternalNotificationDispatcher: Preparing to notify ${recipientName} (${recipientId})`);
    
    const preferences = this.getRecipientPreferences(recipientId);
    
    if (!preferences) {
      console.warn(`⚠️ No notification preferences found for ${recipientId}`);
      return { success: false, channels: [] };
    }
    
    const sentChannels: string[] = [];
    const notificationTypeKey = content.type === 'approval' ? 'approvals' : 
                                 content.type === 'update' ? 'updates' : 'reminders';
    
    // Email
    if (preferences.email.enabled && preferences.email[notificationTypeKey]) {
      const recipientEmail = this.getRecipientEmail(recipientId);
      if (recipientEmail) {
        const sent = await this.sendEmail(recipientEmail, { ...content, recipientName });
        if (sent) sentChannels.push('Email');
      }
    }
    
    // Push
    if (preferences.push.enabled && preferences.push[notificationTypeKey]) {
      const sent = await this.sendPushNotification(recipientId, { ...content, recipientName });
      if (sent) sentChannels.push('Push');
    }
    
    // SMS
    if (preferences.sms.enabled && preferences.sms[notificationTypeKey]) {
      const recipientPhone = this.getRecipientPhone(recipientId);
      if (recipientPhone) {
        const sent = await this.sendSMS(recipientPhone, { ...content, recipientName });
        if (sent) sentChannels.push('SMS');
      }
    }
    
    // WhatsApp
    if (preferences.whatsapp.enabled && preferences.whatsapp[notificationTypeKey]) {
      const recipientPhone = this.getRecipientPhone(recipientId);
      if (recipientPhone) {
        const sent = await this.sendWhatsApp(recipientPhone, { ...content, recipientName });
        if (sent) sentChannels.push('WhatsApp');
      }
    }
    
    console.log(`✅ Notifications sent via: ${sentChannels.join(', ') || 'None (preferences disabled)'}`);
    
    return {
      success: sentChannels.length > 0,
      channels: sentChannels
    };
  }

  /**
   * Get recipient email (mock implementation)
   */
  private getRecipientEmail(recipientId: string): string | null {
    // TODO: Replace with actual user data lookup
    const emailMap: { [key: string]: string } = {
      'principal': 'principal@institution.edu',
      'hod': 'hod@institution.edu',
      'dean': 'dean@institution.edu',
      'registrar': 'registrar@institution.edu',
      'controller': 'controller@institution.edu',
    };
    
    return emailMap[recipientId.toLowerCase()] || `${recipientId}@institution.edu`;
  }

  /**
   * Get recipient phone (mock implementation)
   */
  private getRecipientPhone(recipientId: string): string | null {
    // TODO: Replace with actual user data lookup
    const phoneMap: { [key: string]: string } = {
      'principal': '+1234567890',
      'hod': '+1234567891',
      'dean': '+1234567892',
      'registrar': '+1234567893',
      'controller': '+1234567894',
    };
    
    return phoneMap[recipientId.toLowerCase()] || null;
  }
}

// Export singleton instance
export const ExternalNotificationDispatcher = new ExternalNotificationDispatcherClass();
