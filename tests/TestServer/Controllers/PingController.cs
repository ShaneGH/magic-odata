using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OData.Query;

namespace TestServer.Controllers;

[ApiController]
public class PingController : ControllerBase
{
    private readonly ILogger<PingController> _logger;

    public PingController(ILogger<PingController> logger)
    {
        _logger = logger;
    }

    [HttpGet("ping")]
    public ActionResult Ping()
    {
        return Ok();
    }

    [HttpGet("kill")]
    [HttpPost("kill")]
    public ActionResult Kill()
    {
        Program.App.StopAsync();
        return Ok();
    }
}
