#include <iostream>
#include <string>
#include <curl/curl.h>
#include "json.hpp" // nlohmann/json - single header file

using json = nlohmann::json;

// Callback function to handle the response
size_t WriteCallback(void *contents, size_t size, size_t nmemb, std::string *userp)
{
    userp->append((char *)contents, size * nmemb);
    return size * nmemb;
}

class BallChasingAPI
{
private:
    std::string api_key;
    const std::string base_url = "https://ballchasing.com/api";

public:
    BallChasingAPI(const std::string &key) : api_key(key) {}

    std::string getReplay(const std::string &replay_id)
    {
        CURL *curl;
        CURLcode res;
        std::string readBuffer;

        curl = curl_easy_init();
        if (curl)
        {
            std::string url = base_url + "/replays/" + replay_id;

            // Set up headers
            struct curl_slist *headers = NULL;
            std::string auth_header = "Authorization: " + api_key;
            headers = curl_slist_append(headers, auth_header.c_str());

            curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
            curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
            curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
            curl_easy_setopt(curl, CURLOPT_WRITEDATA, &readBuffer);

            // Perform the request
            res = curl_easy_perform(curl);

            if (res != CURLE_OK)
            {
                std::cerr << "curl_easy_perform() failed: "
                          << curl_easy_strerror(res) << std::endl;
            }

            curl_slist_free_all(headers);
            curl_easy_cleanup(curl);
        }
        return readBuffer;
    }

    //Convert replay data to structured JSON
    json getReplayStructured(const std::string &replay_id)
    {
        std::string response = getReplay(replay_id);
        json structured_output;

        try
        {
            json data = json::parse(response);

            // Check if replay is successfully processed
            if (data["status"] != "ok")
            {
                structured_output["error"] = "Replay status: " + data["status"].get<std::string>();
                return structured_output;
            }

            // Basic match information
            structured_output["replay_id"] = replay_id;
            structured_output["title"] = data.value("title", "Unknown");
            structured_output["map"] = data.value("map_code", "Unknown");
            structured_output["date"] = data.value("date", "");
            structured_output["duration"] = data.value("duration", 300);
            structured_output["gameMode"] = data.value("playlist_name", "Standard");
            
            // Score information
            structured_output["blueScore"] = data["blue"]["stats"]["core"]["goals"];
            structured_output["orangeScore"] = data["orange"]["stats"]["core"]["goals"];
            
            // Determine winning team
            int blueGoals = data["blue"]["stats"]["core"]["goals"];
            int orangeGoals = data["orange"]["stats"]["core"]["goals"];
            structured_output["winningTeam"] = (blueGoals > orangeGoals) ? "blue" : "orange";

            // Players array
            json players = json::array();

            // Process blue team players
            if (data["blue"].contains("players"))
            {
                for (const auto &player : data["blue"]["players"])
                {
                    players.push_back(extractPlayerData(player, "blue"));
                }
            }

            // Process orange team players
            if (data["orange"].contains("players"))
            {
                for (const auto &player : data["orange"]["players"])
                {
                    players.push_back(extractPlayerData(player, "orange"));
                }
            }

            structured_output["players"] = players;
            structured_output["success"] = true;
        }
        catch (json::exception &e)
        {
            structured_output["error"] = std::string("JSON parsing error: ") + e.what();
            structured_output["success"] = false;
        }

        return structured_output;
    }

    void printPlayerStats(const std::string &replay_id)
    {
        std::string response = getReplay(replay_id);

        try
        {
            json data = json::parse(response);

            if (data["status"] != "ok")
            {
                std::cerr << "Replay status: " << data["status"] << std::endl;
                return;
            }

            std::cout << "Replay Title: " << data["title"] << std::endl;
            std::cout << "Map: " << data["map_code"] << std::endl;
            std::cout << "\n--- Blue Team ---" << std::endl;

            for (const auto &player : data["blue"]["players"])
            {
                printPlayer(player);
            }

            std::cout << "\n--- Orange Team ---" << std::endl;

            for (const auto &player : data["orange"]["players"])
            {
                printPlayer(player);
            }
        }
        catch (json::exception &e)
        {
            std::cerr << "JSON parsing error: " << e.what() << std::endl;
        }
    }

private:
    json extractPlayerData(const json &player, const std::string &team)
    {
        json player_data;
        
        player_data["name"] = player.value("name", "Unknown");
        player_data["team"] = team;
        
        // Platform information
        if (player.contains("id") && player["id"].contains("platform"))
        {
            player_data["platform"] = player["id"]["platform"];
        }
        else
        {
            player_data["platform"] = "Unknown";
        }

        // Core stats
        if (player.contains("stats") && player["stats"].contains("core"))
        {
            const auto &core = player["stats"]["core"];
            
            player_data["score"] = core.value("score", 0);
            player_data["goals"] = core.value("goals", 0);
            player_data["assists"] = core.value("assists", 0);
            player_data["saves"] = core.value("saves", 0);
            player_data["shots"] = core.value("shots", 0);
            player_data["shooting_percentage"] = core.value("shooting_percentage", 0.0);
        }
        else
        {
            player_data["score"] = 0;
            player_data["goals"] = 0;
            player_data["assists"] = 0;
            player_data["saves"] = 0;
            player_data["shots"] = 0;
            player_data["shooting_percentage"] = 0.0;
        }

        // MVP status
        player_data["mvp"] = player.value("mvp", false);

        return player_data;
    }

    void printPlayer(const json &player)
    {
        std::cout << "\nPlayer: " << player["name"] << std::endl;
        std::cout << "  Score: " << player["stats"]["core"]["score"] << std::endl;
        std::cout << "  Goals: " << player["stats"]["core"]["goals"] << std::endl;
        std::cout << "  Assists: " << player["stats"]["core"]["assists"] << std::endl;
        std::cout << "  Saves: " << player["stats"]["core"]["saves"] << std::endl;
        std::cout << "  Shots: " << player["stats"]["core"]["shots"] << std::endl;
        std::cout << "  Shooting %: " << player["stats"]["core"]["shooting_percentage"] << std::endl;

        if (player.contains("mvp") && player["mvp"] == true)
        {
            std::cout << "  MVP: Yes" << std::endl;
        }
    }
};

int main(int argc, char *argv[])
{
    // API key
    const char* key = std::getenv("BALLCHASING_API_KEY");
    if (!key) {
        std::cerr << "Missing API key: BALLCHASING_API_KEY is not set!" << std::endl;
        return 1;
    }
    std::string api_key = key;


    // Initialize the API client
    BallChasingAPI api(api_key);

    // Check command line arguments
    if (argc < 2)
    {
        std::cerr << "Usage: " << argv[0] << " <replay_id> [--json]" << std::endl;
        return 1;
    }

    std::string replay_id = argv[1];
    bool json_output = false;

    // Check if JSON output is requested
    if (argc >= 3 && std::string(argv[2]) == "--json")
    {
        json_output = true;
    }

    if (json_output)
    {
        // Output structured JSON for Node.js backend
        json result = api.getReplayStructured(replay_id);
        std::cout << result.dump(2) << std::endl;
    }
    else
    {
        // Original human-readable output
        api.printPlayerStats(replay_id);
    }

    return 0;
}
