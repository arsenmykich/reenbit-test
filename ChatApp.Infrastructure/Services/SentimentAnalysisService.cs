using System;
using System.Threading.Tasks;
using Azure;
using Azure.AI.TextAnalytics;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace ChatApp.Infrastructure.Services
{
    public interface ISentimentAnalysisService
    {
        Task<(double score, string label)> AnalyzeSentimentAsync(string text);
    }

    public class SentimentAnalysisService : ISentimentAnalysisService
    {
        private readonly TextAnalyticsClient _textAnalyticsClient;
        private readonly ILogger<SentimentAnalysisService> _logger;
        private readonly bool _useAzureService;

        public SentimentAnalysisService(IConfiguration configuration, ILogger<SentimentAnalysisService> logger)
        {
            _logger = logger;
            
            var endpoint = configuration["AzureCognitiveServices:Endpoint"];
            var subscriptionKey = configuration["AzureCognitiveServices:SubscriptionKey"];
            
            // Check if Azure credentials are configured
            if (!string.IsNullOrEmpty(endpoint) && 
                !string.IsNullOrEmpty(subscriptionKey) && 
                !subscriptionKey.Contains("ВСТАВТЕ_ВАШ_КЛЮЧ_СЮДИ") &&
                !subscriptionKey.Contains("your-subscription-key"))
            {
                try
                {
                    var credential = new AzureKeyCredential(subscriptionKey);
                    _textAnalyticsClient = new TextAnalyticsClient(new Uri(endpoint), credential);
                    _useAzureService = true;
                    _logger.LogInformation("Azure Text Analytics client initialized successfully");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to initialize Azure Text Analytics client, falling back to mock service");
                    _useAzureService = false;
                }
            }
            else
            {
                _logger.LogWarning("Azure Cognitive Services not configured, using mock sentiment analysis");
                _useAzureService = false;
            }
        }

        public async Task<(double score, string label)> AnalyzeSentimentAsync(string text)
        {
            if (string.IsNullOrWhiteSpace(text))
            {
                return (0.5, "Neutral");
            }

            if (_useAzureService && _textAnalyticsClient != null)
            {
                return await AnalyzeWithAzureAsync(text);
            }
            else
            {
                return await AnalyzeWithMockAsync(text);
            }
        }

        private async Task<(double score, string label)> AnalyzeWithAzureAsync(string text)
        {
            try
            {
                _logger.LogInformation("Analyzing sentiment with Azure Text Analytics: {Text}", text);
                
                var response = await _textAnalyticsClient.AnalyzeSentimentAsync(text);
                var documentSentiment = response.Value;
                
                double score;
                string label = documentSentiment.Sentiment.ToString();
                
                // Convert Azure confidence scores to our 0-1 scale
                switch (documentSentiment.Sentiment)
                {
                    case TextSentiment.Positive:
                        score = 0.5 + (documentSentiment.ConfidenceScores.Positive / 2.0);
                        break;
                    case TextSentiment.Negative:
                        score = 0.5 - (documentSentiment.ConfidenceScores.Negative / 2.0);
                        break;
                    case TextSentiment.Neutral:
                    case TextSentiment.Mixed:
                    default:
                        score = 0.5;
                        label = "Neutral";
                        break;
                }

                _logger.LogInformation("Azure sentiment analysis result: {Label} (score: {Score})", label, score);
                return (Math.Max(0, Math.Min(1, score)), label);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calling Azure Text Analytics, falling back to mock service");
                return await AnalyzeWithMockAsync(text);
            }
        }

        private async Task<(double score, string label)> AnalyzeWithMockAsync(string text)
        {
            _logger.LogInformation("Using mock sentiment analysis for: {Text}", text);
            
            // Simple keyword-based sentiment analysis for demo/fallback
            text = text.ToLower();
            
            var positiveWords = new[] { "good", "great", "excellent", "awesome", "love", "happy", "wonderful", "amazing", "fantastic", "nice", "cool", "super" };
            var negativeWords = new[] { "bad", "terrible", "awful", "hate", "sad", "angry", "horrible", "disgusting", "worst", "sucks", "stupid" };
            
            int positiveCount = 0;
            int negativeCount = 0;
            
            foreach (var word in positiveWords)
            {
                if (text.Contains(word))
                    positiveCount++;
            }
            
            foreach (var word in negativeWords)
            {
                if (text.Contains(word))
                    negativeCount++;
            }
            
            // Calculate sentiment score
            double score;
            string label;
            
            if (positiveCount > negativeCount)
            {
                score = 0.7 + (Math.Min(positiveCount - negativeCount, 3) * 0.1);
                label = "Positive";
            }
            else if (negativeCount > positiveCount)
            {
                score = 0.3 - (Math.Min(negativeCount - positiveCount, 3) * 0.1);
                label = "Negative";
            }
            else
            {
                score = 0.5;
                label = "Neutral";
            }
            
            // Simulate async operation
            await Task.Delay(50);
            
            _logger.LogInformation("Mock sentiment analysis result: {Label} (score: {Score})", label, score);
            return (Math.Max(0, Math.Min(1, score)), label);
        }
    }
} 