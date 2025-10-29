import { PrismaClient } from '../generated/prisma';
import { Content } from '../types/ai';

const prisma = new PrismaClient();

export class ConversationService {
  /**
   * Get or create a conversation for a user
   * @param userId - WhatsApp JID
   * @returns Conversation with messages
   */
  async getOrCreateConversation(userId: string) {
    let conversation = await prisma.conversation.findFirst({
      where: { userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          userId,
          messages: {
            create: [
              {
                role: 'user',
                content: JSON.stringify({ parts: [{ text: 'Hello' }] }),
              },
              {
                role: 'model',
                content: JSON.stringify({
                  parts: [{
                    text: `Great to meet you. Today is ${new Date().toDateString()}. What would you like to know?`
                  }]
                }),
              },
            ],
          },
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    }

    return conversation;
  }

  /**
   * Get conversation history as Content array
   * @param userId - WhatsApp JID
   * @returns Array of Content objects
   */
  async getConversationHistory(userId: string): Promise<Content[]> {
    const conversation = await this.getOrCreateConversation(userId);
    
    return conversation.messages.map(msg => ({
      role: msg.role as 'user' | 'model',
      parts: JSON.parse(msg.content).parts,
    }));
  }

  /**
   * Add a message to the conversation
   * @param userId - WhatsApp JID
   * @param role - 'user' or 'model'
   * @param content - Message content
   */
  async addMessage(userId: string, role: 'user' | 'model', content: any) {
    const conversation = await this.getOrCreateConversation(userId);

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role,
        content: JSON.stringify(content),
      },
    });
  }

  /**
   * Clear conversation history for a user
   * @param userId - WhatsApp JID
   */
  async clearConversation(userId: string) {
    const conversation = await prisma.conversation.findFirst({
      where: { userId },
    });

    if (conversation) {
      await prisma.message.deleteMany({
        where: { conversationId: conversation.id },
      });

      // Reinitialize with greeting
      await prisma.message.createMany({
        data: [
          {
            conversationId: conversation.id,
            role: 'user',
            content: JSON.stringify({ parts: [{ text: 'Hello' }] }),
          },
          {
            conversationId: conversation.id,
            role: 'model',
            content: JSON.stringify({
              parts: [{
                text: `Great to meet you. Today is ${new Date().toDateString()}. What would you like to know?`
              }]
            }),
          },
        ],
      });
    }
  }

  /**
   * Update conversation with new messages
   * @param userId - WhatsApp JID
   * @param newMessages - Array of new messages to add
   */
  async updateConversation(userId: string, newMessages: Content[]) {
    const conversation = await this.getOrCreateConversation(userId);

    for (const message of newMessages) {
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: message.role,
          content: JSON.stringify({ parts: message.parts }),
        },
      });
    }
  }
}

export const conversationService = new ConversationService();
