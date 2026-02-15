import { useState, useRef, useEffect } from 'react';
import { Button } from '../common';
import {
  chatWithChef,
  executeQuickAction,
  testOllamaConnection,
  type ChatResult,
} from '../../services/chefOllama';
import type { Recipe, ChefOllamaMessage, QuickAction } from '../../types';

interface ChefOllamaChatProps {
  recipe: Recipe;
  currentStepIndex: number;
  checkedIngredients: string[];
  initialMessage?: string;
  onClose: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  actions?: ChatResult['suggestedActions'];
}

const QUICK_ACTIONS: { action: QuickAction; label: string; icon: string }[] = [
  { action: 'substitution', label: 'Substitution', icon: '🔄' },
  { action: 'i_messed_up', label: 'I messed up', icon: '😰' },
  { action: 'what_should_this_look_like', label: 'What should this look like?', icon: '👁️' },
];

export function ChefOllamaChat({
  recipe,
  currentStepIndex,
  checkedIngredients,
  initialMessage,
  onClose,
}: ChefOllamaChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check Ollama connection on mount
  useEffect(() => {
    checkConnection();
  }, []);

  // Handle initial message (e.g., from missing ingredient)
  useEffect(() => {
    if (initialMessage) {
      sendMessage(initialMessage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessage]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function checkConnection() {
    const result = await testOllamaConnection();
    setConnected(result.connected);
  }

  async function sendMessage(content: string) {
    if (!content.trim()) return;

    const userMessage: Message = { role: 'user', content };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const history: ChefOllamaMessage[] = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const result = await chatWithChef(
        content,
        recipe,
        currentStepIndex,
        checkedIngredients,
        history
      );

      const assistantMessage: Message = {
        role: 'assistant',
        content: result.response,
        actions: result.suggestedActions,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleQuickAction(action: QuickAction) {
    setLoading(true);

    try {
      const currentStep = recipe.steps[currentStepIndex];
      const stepTitle = currentStep?.title || `Step ${currentStepIndex + 1}`;
      const result = await executeQuickAction(
        action,
        `Currently on step ${currentStepIndex + 1}: ${stepTitle}`,
        recipe,
        currentStepIndex,
        checkedIngredients
      );

      const assistantMessage: Message = {
        role: 'assistant',
        content: result.response,
        actions: result.suggestedActions,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleActionClick(actionType: string) {
    switch (actionType) {
      case 'update_recipe':
        // TODO: trigger recipe update flow
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'Recipe update feature is not yet available. For now, you can make this change manually in the recipe editor.' },
        ]);
        break;
      case 'just_this_time':
        // Just acknowledge, no permanent change
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'Got it! Using this substitution just for this cook.' },
        ]);
        break;
      case 'save_as_variant':
        // TODO: create a variant recipe
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'Save as variant is not yet available. You can import the recipe again and make the changes in the editor.' },
        ]);
        break;
    }
  }

  const currentStep = recipe.steps[currentStepIndex];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '400px',
        maxWidth: '100vw',
        background: 'var(--card-bg)',
        boxShadow: 'var(--card-shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: '1rem',
          borderBottom: '1px solid var(--border-primary)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.5rem' }}>👨‍🍳</span>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Chef Ollama</span>
          {connected !== null && (
            <span
              style={{
                width: '0.5rem',
                height: '0.5rem',
                borderRadius: '50%',
                background: connected ? 'var(--success)' : 'var(--warning)',
              }}
              title={connected ? 'Connected' : 'Using offline mode'}
            />
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          ✕
        </Button>
      </header>

      {/* Context Banner */}
      <div
        style={{
          padding: '0.75rem 1rem',
          background: 'var(--bg-tertiary)',
          fontSize: '0.75rem',
          color: 'var(--text-tertiary)',
        }}
      >
        <div>
          <strong>Recipe:</strong> {recipe.name}
        </div>
        <div>
          <strong>Step {currentStepIndex + 1}:</strong> {currentStep?.title || 'Unknown step'}
        </div>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', marginTop: '2rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👨‍🍳</div>
            <p style={{ margin: 0 }}>
              I'm here to help! Ask me about substitutions, techniques, or what to do if something
              goes wrong.
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            style={{
              alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
            }}
          >
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '1rem',
                background: message.role === 'user' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                color: message.role === 'user' ? 'white' : 'var(--text-primary)',
              }}
            >
              {message.content}
            </div>

            {message.actions && message.actions.length > 0 && (
              <div
                style={{
                  marginTop: '0.5rem',
                  display: 'flex',
                  gap: '0.5rem',
                  flexWrap: 'wrap',
                }}
              >
                {message.actions.map((action) => (
                  <Button
                    key={action.type}
                    variant="secondary"
                    size="sm"
                    onClick={() => handleActionClick(action.type)}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div
            style={{
              alignSelf: 'flex-start',
              padding: '0.75rem 1rem',
              borderRadius: '1rem',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-tertiary)',
            }}
          >
            Thinking...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div
        style={{
          padding: '0.75rem 1rem',
          borderTop: '1px solid var(--border-primary)',
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
        }}
      >
        {QUICK_ACTIONS.map(({ action, label, icon }) => (
          <Button
            key={action}
            variant="secondary"
            size="sm"
            onClick={() => handleQuickAction(action)}
            disabled={loading}
          >
            {icon} {label}
          </Button>
        ))}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(input);
        }}
        style={{
          padding: '1rem',
          borderTop: '1px solid var(--border-primary)',
          display: 'flex',
          gap: '0.5rem',
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Chef Ollama..."
          disabled={loading}
          style={{
            flex: 1,
            padding: '0.75rem 1rem',
            border: '1px solid var(--border-secondary)',
            borderRadius: '0.5rem',
            fontSize: '1rem',
            outline: 'none',
          }}
        />
        <Button type="submit" disabled={loading || !input.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}
